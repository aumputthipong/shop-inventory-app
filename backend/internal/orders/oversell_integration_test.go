//go:build integration

package orders_test

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/testdb"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type env struct {
	pool     *pgxpool.Pool
	products *products.Service
	stock    *stock.Service
	orders   *orders.Service
}

func newEnv(t *testing.T) env {
	t.Helper()
	pool := testdb.Pool(t)

	return env{
		pool:     pool,
		products: products.NewService(products.NewRepository(pool)),
		stock:    stock.NewService(stock.NewRepository(pool)),
		orders:   orders.NewService(orders.NewRepository(pool)),
	}
}

func (e env) product(t *testing.T, onHand int32) int64 {
	t.Helper()
	p, err := e.products.Create(t.Context(), products.Input{
		SKU: testdb.Unique("IT-"), Name: "race test item", Price: "10.00", IsActive: true,
	})
	require.NoError(t, err)
	_, err = e.stock.StockIn(t.Context(), stock.ReceiptInput{ProductID: p.ID, Qty: onHand})
	require.NoError(t, err)
	return p.ID
}

func (e env) balance(t *testing.T, productID int64) products.Product {
	t.Helper()
	d, err := e.products.Get(t.Context(), productID)
	require.NoError(t, err)
	return d.Product
}

// assertLedgerExplainsBalance checks that the movements alone rebuild the stored balance.
func (e env) assertLedgerExplainsBalance(t *testing.T, productID int64) {
	t.Helper()
	moves, _, err := e.stock.ListMovements(t.Context(), stock.MovementFilter{ProductID: &productID, Limit: 200})
	require.NoError(t, err)

	var onHand, reserved int32
	for _, m := range moves {
		onHand += m.QtyChange
		reserved += m.ReservedChange
	}
	b := e.balance(t, productID)
	assert.Equal(t, b.OnHand, onHand, "ledger on_hand")
	assert.Equal(t, b.Reserved, reserved, "ledger reserved")
}

// race starts every attempt at once so they all contend for the same rows.
func race(n int, attempt func(i int) error) []error {
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make([]error, n)
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			errs[i] = attempt(i)
		}()
	}
	close(start)
	wg.Wait()
	return errs
}

func TestConcurrentOrdersNeverOversell(t *testing.T) {
	e := newEnv(t)
	const stockOnHand, buyers = 5, 40
	productID := e.product(t, stockOnHand)

	errs := race(buyers, func(i int) error {
		_, err := e.orders.Create(context.Background(), orders.NewOrder{
			Channel:     orders.ChannelShopee,
			ExternalRef: fmt.Sprintf("RACE-%d-%d", productID, i),
			Items:       []orders.ItemRequest{{ProductID: productID, Qty: 1}},
		})
		return err
	})

	var sold, rejected int
	for _, err := range errs {
		switch {
		case err == nil:
			sold++
		case errors.Is(err, stock.ErrInsufficientStock):
			rejected++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}

	assert.Equal(t, stockOnHand, sold, "exactly the units on hand are sold")
	assert.Equal(t, buyers-stockOnHand, rejected)

	b := e.balance(t, productID)
	assert.Equal(t, int32(stockOnHand), b.OnHand)
	assert.Equal(t, int32(stockOnHand), b.Reserved)
	assert.Equal(t, int32(0), b.Available())
	e.assertLedgerExplainsBalance(t, productID)
}

func TestMultiItemOrdersAreAllOrNothingUnderContention(t *testing.T) {
	e := newEnv(t)
	a := e.product(t, 4)
	b := e.product(t, 4)

	shapes := [][]orders.ItemRequest{
		{{ProductID: a, Qty: 1}, {ProductID: b, Qty: 1}},
		{{ProductID: b, Qty: 2}, {ProductID: a, Qty: 1}},
		{{ProductID: a, Qty: 2}},
	}

	var mu sync.Mutex
	var placed []orders.Order
	errs := race(30, func(i int) error {
		o, err := e.orders.Create(context.Background(), orders.NewOrder{Items: shapes[i%len(shapes)], Customer: pickupLater})
		if err == nil {
			mu.Lock()
			placed = append(placed, o)
			mu.Unlock()
		}
		return err
	})
	for _, err := range errs {
		if err != nil {
			require.ErrorIs(t, err, stock.ErrInsufficientStock)
		}
	}
	require.NotEmpty(t, placed)

	want := map[int64]int32{}
	for _, o := range placed {
		for _, item := range o.Items {
			want[item.ProductID] += item.Qty
		}
	}
	for _, id := range []int64{a, b} {
		got := e.balance(t, id)
		assert.Equal(t, want[id], got.Reserved, "reserved equals the sum of accepted orders, so no order was half reserved")
		assert.LessOrEqual(t, got.Reserved, got.OnHand)
		e.assertLedgerExplainsBalance(t, id)
	}
}

func TestShipAndCancelKeepLedgerAndBalanceInStep(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	productID := e.product(t, 10)

	create := func(qty int32) orders.Order {
		o, err := e.orders.Create(ctx, orders.NewOrder{Items: []orders.ItemRequest{{ProductID: productID, Qty: qty}}, Customer: pickupLater})
		require.NoError(t, err)
		return o
	}
	shipped, canceled := create(3), create(4)

	_, err := e.orders.Apply(ctx, shipped.ID, orders.ActionPack)
	require.NoError(t, err)
	_, err = e.orders.Apply(ctx, shipped.ID, orders.ActionShip)
	require.NoError(t, err)
	_, err = e.orders.Apply(ctx, canceled.ID, orders.ActionCancel)
	require.NoError(t, err)

	_, err = e.orders.Apply(ctx, shipped.ID, orders.ActionCancel)
	var te *orders.TransitionError
	require.ErrorAs(t, err, &te, "a shipped order cannot release stock again")

	b := e.balance(t, productID)
	assert.Equal(t, int32(7), b.OnHand)
	assert.Equal(t, int32(0), b.Reserved)
	e.assertLedgerExplainsBalance(t, productID)
}

func TestHandedOverStoreSaleShipsAtOnce(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	productID := e.product(t, 5)

	o, err := e.orders.Create(ctx, orders.NewOrder{
		HandedOver: true, Items: []orders.ItemRequest{{ProductID: productID, Qty: 2}},
	})
	require.NoError(t, err)
	assert.Equal(t, orders.StatusShipped, o.Status)
	assert.NotNil(t, o.ShippedAt)

	_, err = e.orders.Create(ctx, orders.NewOrder{
		HandedOver: true, Items: []orders.ItemRequest{{ProductID: productID, Qty: 4}},
	})
	require.ErrorIs(t, err, stock.ErrInsufficientStock, "a counter sale cannot oversell either")

	b := e.balance(t, productID)
	assert.Equal(t, int32(3), b.OnHand)
	assert.Equal(t, int32(0), b.Reserved)
	e.assertLedgerExplainsBalance(t, productID)
}

func TestLineAndCounterCompeteForTheLastUnit(t *testing.T) {
	e := newEnv(t)
	productID := e.product(t, 1)

	errs := race(2, func(i int) error {
		in := orders.NewOrder{HandedOver: true, Items: []orders.ItemRequest{{ProductID: productID, Qty: 1}}}
		if i == 0 {
			in = orders.NewOrder{
				Channel: orders.ChannelLine, Items: []orders.ItemRequest{{ProductID: productID, Qty: 1}},
				Customer: &orders.Customer{Name: "พลอย", Phone: "0812345678", Address: "กรุงเทพ", LineUserID: "U-race"},
			}
		}
		_, err := e.orders.Create(t.Context(), in)
		return err
	})

	var won, lost int
	for _, err := range errs {
		switch {
		case err == nil:
			won++
		case errors.Is(err, stock.ErrInsufficientStock):
			lost++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	assert.Equal(t, 1, won, "exactly one channel gets the last unit")
	assert.Equal(t, 1, lost)
	assert.GreaterOrEqual(t, e.balance(t, productID).Available(), int32(0))
	e.assertLedgerExplainsBalance(t, productID)
}

func TestLineOrderKeepsItsCustomer(t *testing.T) {
	e := newEnv(t)
	productID := e.product(t, 3)

	o, err := e.orders.Create(t.Context(), orders.NewOrder{
		Channel: orders.ChannelLine, Items: []orders.ItemRequest{{ProductID: productID, Qty: 1}},
		Customer: &orders.Customer{Name: "พลอย", Phone: "0812345678", Address: "12 สุขุมวิท", LineUserID: "U-keep"},
	})
	require.NoError(t, err)

	got, err := e.orders.Get(t.Context(), o.ID)
	require.NoError(t, err)
	require.NotNil(t, got.Customer)
	assert.Equal(t, orders.Customer{Name: "พลอย", Phone: "0812345678", Address: "12 สุขุมวิท", LineUserID: "U-keep"}, *got.Customer)
}

func TestAdjustCannotTakeReservedUnits(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	productID := e.product(t, 8)
	_, err := e.orders.Create(ctx, orders.NewOrder{Items: []orders.ItemRequest{{ProductID: productID, Qty: 5}}, Customer: pickupLater})
	require.NoError(t, err)

	_, err = e.stock.Adjust(ctx, stock.AdjustInput{ProductID: productID, QtyChange: -4, Reason: stock.ReasonDamaged})
	require.ErrorIs(t, err, stock.ErrInsufficientStock)

	b, err := e.stock.Adjust(ctx, stock.AdjustInput{ProductID: productID, QtyChange: -3, Reason: stock.ReasonDamaged})
	require.NoError(t, err)
	assert.Equal(t, int32(0), b.Available())
	e.assertLedgerExplainsBalance(t, productID)
}

func TestListOrdersOldestFirst(t *testing.T) {
	e := newEnv(t)
	id := e.product(t, 10)
	for range 2 {
		_, err := e.orders.Create(t.Context(), orders.NewOrder{
			Items: []orders.ItemRequest{{ProductID: id, Qty: 1}}, Customer: &orders.Customer{Name: "Ann"},
		})
		require.NoError(t, err)
	}
	reserved := orders.StatusReserved

	for _, oldest := range []bool{true, false} {
		items, _, err := e.orders.List(t.Context(), orders.Filter{Status: &reserved, OldestFirst: oldest, Limit: 100})
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(items), 2)
		for i := 1; i < len(items); i++ {
			prev, cur := items[i-1], items[i]
			ascending := prev.CreatedAt.Before(cur.CreatedAt) || (prev.CreatedAt.Equal(cur.CreatedAt) && prev.ID < cur.ID)
			assert.Equal(t, oldest, ascending, "order %d then %d", prev.ID, cur.ID)
		}
	}
}

func TestListOrdersShowsWhatToPick(t *testing.T) {
	e := newEnv(t)
	first, second := e.product(t, 5), e.product(t, 5)
	created, err := e.orders.Create(t.Context(), orders.NewOrder{
		Items:    []orders.ItemRequest{{ProductID: second, Qty: 2}, {ProductID: first, Qty: 1}},
		Customer: &orders.Customer{Name: "Ann"},
	})
	require.NoError(t, err)
	search := created.OrderNo

	items, _, err := e.orders.List(t.Context(), orders.Filter{Search: &search, Limit: 10})
	require.NoError(t, err)
	require.Len(t, items, 1)
	require.NotNil(t, items[0].CustomerName)
	assert.Equal(t, "Ann", *items[0].CustomerName)
	assert.Equal(t, []orders.Pick{{Name: "race test item", Qty: 2}, {Name: "race test item", Qty: 1}}, items[0].Picks)
}

func TestListOrdersFindsCustomersAndCountsStatuses(t *testing.T) {
	e := newEnv(t)
	id := e.product(t, 5)
	name := testdb.Unique("Ann ")
	_, err := e.orders.Create(t.Context(), orders.NewOrder{
		Channel:  orders.ChannelLine,
		Items:    []orders.ItemRequest{{ProductID: id, Qty: 1}},
		Customer: &orders.Customer{Name: name, Phone: "0812345678"},
	})
	require.NoError(t, err)
	line := orders.ChannelLine
	store := orders.ChannelStore

	found, total, err := e.orders.List(t.Context(), orders.Filter{Search: &name, Channel: &line, Limit: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, found, 1)

	none, _, err := e.orders.List(t.Context(), orders.Filter{Search: &name, Channel: &store, Limit: 10})
	require.NoError(t, err)
	assert.Empty(t, none)

	counts, err := e.orders.StatusCounts(t.Context(), orders.Filter{Search: &name})
	require.NoError(t, err)
	assert.Equal(t, map[orders.Status]int64{
		orders.StatusReserved: 1, orders.StatusPacked: 0, orders.StatusShipped: 0, orders.StatusCanceled: 0,
	}, counts)
}
