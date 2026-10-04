package line_test

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/line"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
)

type fakeOrders struct {
	got *orders.NewOrder
	err error
}

func (f *fakeOrders) Create(_ context.Context, in orders.NewOrder) (orders.Order, error) {
	f.got = &in
	if f.err != nil {
		return orders.Order{}, f.err
	}
	return orders.Order{OrderNo: "ORD-2026-00042", Status: orders.StatusReserved}, nil
}

type fakeProducts []products.Product

func (f fakeProducts) List(context.Context, string) ([]products.Product, error) {
	return f, nil
}

func newService(mode string, o *fakeOrders) *line.Service {
	catalog := fakeProducts{
		{ID: 1, Name: "เสื้อยืด", Price: "290.00", IsActive: true, OnHand: 30, LowStockThreshold: 5},
		{ID: 2, Name: "กางเกง", Price: "600.00", IsActive: true, OnHand: 8, Reserved: 5, LowStockThreshold: 5},
		{ID: 3, Name: "หมวกเลิกขาย", Price: "250.00", IsActive: false, OnHand: 4},
	}
	return line.NewService(line.Settings{Mode: mode, OAURL: "https://line.me/R/ti/p/@shop"}, line.DevVerifier{}, o, catalog)
}

func validInput() line.OrderInput {
	return line.OrderInput{
		IDToken: "dev:ploy", Name: "พลอย", Phone: "081-234-5678", Address: "12 ถนนสุขุมวิท กรุงเทพ",
		Items: []orders.ItemRequest{{ProductID: 1, Qty: 2}},
	}
}

func TestPlaceOrder(t *testing.T) {
	tests := []struct {
		name      string
		mutate    func(*line.OrderInput)
		wantErr   error
		wantField string
	}{
		{name: "a signed-in customer orders on the line channel", mutate: func(*line.OrderInput) {}},
		{name: "a forged sign-in is refused", mutate: func(in *line.OrderInput) { in.IDToken = "made-up" }, wantErr: line.ErrInvalidToken},
		{name: "needs a name", mutate: func(in *line.OrderInput) { in.Name = "  " }, wantField: "name"},
		{name: "needs a Thai phone number", mutate: func(in *line.OrderInput) { in.Phone = "12345" }, wantField: "phone"},
		{name: "needs an address", mutate: func(in *line.OrderInput) { in.Address = "" }, wantField: "address"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			o := &fakeOrders{}
			in := validInput()
			tt.mutate(&in)

			_, err := newService(line.ModeDev, o).PlaceOrder(t.Context(), in)

			switch {
			case tt.wantErr != nil:
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, o.got)
			case tt.wantField != "":
				var ce *line.CustomerError
				require.ErrorAs(t, err, &ce)
				assert.Equal(t, tt.wantField, ce.Field)
				assert.Nil(t, o.got)
			default:
				require.NoError(t, err)
				assert.Equal(t, orders.ChannelLine, o.got.Channel)
				assert.Equal(t, &orders.Customer{
					Name: "พลอย", Phone: "0812345678", Address: "12 ถนนสุขุมวิท กรุงเทพ", LineUserID: "dev-ploy",
				}, o.got.Customer)
			}
		})
	}
}

func TestPlaceOrderPassesStockShortageThrough(t *testing.T) {
	shortage := &orders.InsufficientStockError{Items: []orders.Shortage{{ProductID: 1, Requested: 2, Available: 1}}}
	_, err := newService(line.ModeDev, &fakeOrders{err: shortage}).PlaceOrder(t.Context(), validInput())

	var got *orders.InsufficientStockError
	require.ErrorAs(t, err, &got)
}

func TestTurnedOffMeansNoOrdersAndNoCatalog(t *testing.T) {
	svc := newService(line.ModeOff, &fakeOrders{})

	_, err := svc.PlaceOrder(t.Context(), validInput())
	require.ErrorIs(t, err, line.ErrDisabled)
	_, err = svc.Catalog(t.Context())
	require.ErrorIs(t, err, line.ErrDisabled)
}

func TestCatalogHidesInactiveProductsAndExactCounts(t *testing.T) {
	items, err := newService(line.ModeDev, &fakeOrders{}).Catalog(t.Context())
	require.NoError(t, err)

	require.Len(t, items, 2)
	assert.Nil(t, items[0].Available, "plenty of stock shows no number")
	require.NotNil(t, items[1].Available)
	assert.Equal(t, int32(3), *items[1].Available, "low stock shows how many are left")
	assert.Equal(t, products.StatusLow, items[1].Status)
}

type recordingMessenger struct {
	to, text string
	err      error
}

func (m *recordingMessenger) Push(_ context.Context, to, text string) error {
	m.to, m.text = to, text
	return m.err
}

func TestNotifier(t *testing.T) {
	lineOrder := orders.Order{
		OrderNo: "ORD-2026-00042", Status: orders.StatusReserved, Total: "1180.00",
		Items:    []orders.Item{{Name: "เสื้อยืด", Qty: 2}, {Name: "กางเกง", Qty: 1}},
		Customer: &orders.Customer{LineUserID: "U123"},
	}

	t.Run("confirms a new order with its lines and total", func(t *testing.T) {
		m := &recordingMessenger{}
		line.NewNotifier(m, slog.New(slog.DiscardHandler)).OrderUpdated(t.Context(), lineOrder)
		assert.Equal(t, "U123", m.to)
		assert.Equal(t, "ได้รับออเดอร์ ORD-2026-00042 แล้ว\n- เสื้อยืด x 2\n- กางเกง x 1\nรวม 1,180 บาท\nร้านจะแจ้งอีกครั้งเมื่อส่งของ", m.text)
	})

	t.Run("tells the customer when it ships", func(t *testing.T) {
		m := &recordingMessenger{}
		shipped := lineOrder
		shipped.Status = orders.StatusShipped
		line.NewNotifier(m, slog.New(slog.DiscardHandler)).OrderUpdated(t.Context(), shipped)
		assert.Equal(t, "ออเดอร์ ORD-2026-00042 ส่งแล้ว ขอบคุณที่สั่งซื้อ", m.text)
	})

	t.Run("stays quiet for orders that did not come from LINE", func(t *testing.T) {
		m := &recordingMessenger{}
		store := lineOrder
		store.Customer = nil
		line.NewNotifier(m, slog.New(slog.DiscardHandler)).OrderUpdated(t.Context(), store)
		assert.Empty(t, m.to)
	})

	t.Run("a failed message does not panic or block", func(t *testing.T) {
		m := &recordingMessenger{err: errors.New("not a friend of the account")}
		line.NewNotifier(m, slog.New(slog.DiscardHandler)).OrderUpdated(t.Context(), lineOrder)
		assert.Equal(t, "U123", m.to)
	})
}
