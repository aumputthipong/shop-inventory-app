package orders_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/http/httpxtest"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type fakeManager struct {
	orders.Manager
	createErr error
	applyErr  error
}

func (f fakeManager) Create(context.Context, orders.NewOrder) (orders.Order, error) {
	return orders.Order{ID: 1, Status: orders.StatusReserved}, f.createErr
}

func (f fakeManager) Apply(_ context.Context, id int64, _ orders.Action) (orders.Order, error) {
	return orders.Order{ID: id}, f.applyErr
}

func serve(t *testing.T, m orders.Manager, method, path, body string, signedIn bool) *httptest.ResponseRecorder {
	t.Helper()
	router := httpx.NewRouter(httpx.RouterConfig{
		Logger:    slog.New(slog.DiscardHandler),
		GinMode:   config.GinModeTest,
		Protected: []httpx.Route{orders.NewHandler(m)},
		Sessions:  httpxtest.RoleSessions{},
	})
	req := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if signedIn {
		req.AddCookie(&http.Cookie{Name: httpx.SessionCookie, Value: string(actor.RoleStaff)})
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) httpx.ErrorBody {
	t.Helper()
	var body struct {
		Error httpx.ErrorBody `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	return body.Error
}

func TestCreateOrderRequiresSession(t *testing.T) {
	rec := serve(t, fakeManager{}, http.MethodPost, "/api/orders", `{"items":[{"product_id":1,"qty":1}]}`, false)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Equal(t, httpx.CodeUnauthorized, decodeError(t, rec).Code)
}

func TestCreateOrderResponses(t *testing.T) {
	shortage := &orders.InsufficientStockError{Items: []orders.Shortage{
		{ProductID: 2, SKU: "SKU-0002", Name: "jeans", Requested: 4, Available: 3},
	}}

	tests := []struct {
		name       string
		body       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"created", `{"items":[{"product_id":2,"qty":1}]}`, nil, http.StatusCreated, ""},
		{"empty items", `{"items":[]}`, nil, http.StatusUnprocessableEntity, httpx.CodeValidation},
		{"unknown channel", `{"channel":"tiktok","items":[{"product_id":2,"qty":1}]}`, nil, http.StatusUnprocessableEntity, httpx.CodeValidation},
		{"customer name too long", `{"items":[{"product_id":2,"qty":1}],"customer":{"name":"` + strings.Repeat("a", 101) + `"}}`, nil, http.StatusUnprocessableEntity, httpx.CodeValidation},
		{"not enough stock", `{"items":[{"product_id":2,"qty":4}]}`, shortage, http.StatusConflict, httpx.CodeInsufficientStock},
		{"duplicate external ref", `{"items":[{"product_id":2,"qty":1}]}`, orders.ErrExternalRefTaken, http.StatusConflict, httpx.CodeConflict},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, fakeManager{createErr: tt.err}, http.MethodPost, "/api/orders", tt.body, true)
			require.Equal(t, tt.wantStatus, rec.Code, rec.Body.String())
			if tt.wantCode != "" {
				assert.Equal(t, tt.wantCode, decodeError(t, rec).Code)
			}
		})
	}
}

func TestMissingDetailsPointAtTheirField(t *testing.T) {
	tests := []struct {
		err   error
		field string
	}{
		{orders.ErrExternalRefMissing, "external_ref"},
		{orders.ErrCustomerMissing, "customer"},
	}
	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			rec := serve(t, fakeManager{createErr: tt.err}, http.MethodPost, "/api/orders", `{"items":[{"product_id":2,"qty":1}]}`, true)
			require.Equal(t, http.StatusUnprocessableEntity, rec.Code)
			fields := decodeError(t, rec).Fields
			require.Len(t, fields, 1)
			assert.Equal(t, tt.field, fields[0].Field)
		})
	}
}

type capturingManager struct {
	orders.Manager
	got *orders.NewOrder
}

func (m capturingManager) Create(_ context.Context, in orders.NewOrder) (orders.Order, error) {
	*m.got = in
	return orders.Order{ID: 1}, nil
}

func TestCreateOrderPassesTheCustomerOn(t *testing.T) {
	var got orders.NewOrder
	rec := serve(t, capturingManager{got: &got}, http.MethodPost, "/api/orders",
		`{"items":[{"product_id":2,"qty":1}],"customer":{"name":"Ann","phone":"0812345678"}}`, true)

	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	require.NotNil(t, got.Customer)
	assert.Equal(t, orders.Customer{Name: "Ann", Phone: "0812345678"}, *got.Customer)
}

func TestInsufficientStockCarriesEveryShortLine(t *testing.T) {
	shortage := &orders.InsufficientStockError{Items: []orders.Shortage{
		{ProductID: 2, SKU: "SKU-0002", Name: "jeans", Requested: 4, Available: 3},
		{ProductID: 4, SKU: "SKU-0003", Name: "cap", Requested: 1, Available: 0},
	}}
	rec := serve(t, fakeManager{createErr: shortage}, http.MethodPost, "/api/orders",
		`{"items":[{"product_id":2,"qty":4},{"product_id":4,"qty":1}]}`, true)

	var body struct {
		Error struct {
			Details struct {
				Items []struct {
					ProductID int64 `json:"product_id"`
					Available int32 `json:"available"`
				} `json:"items"`
			} `json:"details"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Len(t, body.Error.Details.Items, 2)
	assert.Equal(t, int32(0), body.Error.Details.Items[1].Available)
}

func TestTransitionConflict(t *testing.T) {
	err := &orders.TransitionError{From: orders.StatusShipped, Action: orders.ActionCancel}
	rec := serve(t, fakeManager{applyErr: err}, http.MethodPost, "/api/orders/5/cancel", "", true)

	assert.Equal(t, http.StatusConflict, rec.Code)
	assert.Equal(t, httpx.CodeInvalidState, decodeError(t, rec).Code)
}

type listingManager struct {
	orders.Manager
	got *orders.Filter
}

func (m listingManager) List(_ context.Context, f orders.Filter) ([]orders.Summary, int64, error) {
	*m.got = f
	return nil, 0, nil
}

func TestListOrdersSort(t *testing.T) {
	tests := []struct {
		query      string
		wantStatus int
		wantOldest bool
	}{
		{"", http.StatusOK, false},
		{"?sort=newest", http.StatusOK, false},
		{"?sort=oldest", http.StatusOK, true},
		{"?sort=sideways", http.StatusUnprocessableEntity, false},
	}
	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			var got orders.Filter
			rec := serve(t, listingManager{got: &got}, http.MethodGet, "/api/orders"+tt.query, "", true)
			require.Equal(t, tt.wantStatus, rec.Code, rec.Body.String())
			assert.Equal(t, tt.wantOldest, got.OldestFirst)
		})
	}
}

type salesManager struct {
	orders.Manager
}

func (salesManager) Today(context.Context) (orders.Sales, error) {
	return orders.Sales{
		Date: "2026-10-05", Orders: 3, Revenue: "870.00", Shipped: 1,
		Channels: []orders.ChannelSales{{Channel: orders.ChannelStore, Orders: 3, Revenue: "870.00"}},
	}, nil
}

func TestTodaySalesIsForTheOwner(t *testing.T) {
	tests := []struct {
		role       actor.Role
		wantStatus int
	}{
		{actor.RoleOwner, http.StatusOK},
		{actor.RoleStaff, http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			router := httpx.NewRouter(httpx.RouterConfig{
				Logger:    slog.New(slog.DiscardHandler),
				GinMode:   config.GinModeTest,
				Protected: []httpx.Route{orders.NewHandler(salesManager{})},
				Sessions:  httpxtest.RoleSessions{},
			})
			req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/sales/today", nil)
			req.AddCookie(&http.Cookie{Name: httpx.SessionCookie, Value: string(tt.role)})
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			require.Equal(t, tt.wantStatus, rec.Code, rec.Body.String())
			if tt.wantStatus == http.StatusOK {
				assert.JSONEq(t, `{"date":"2026-10-05","orders":3,"revenue":"870.00","shipped":1,
					"channels":[{"channel":"store","orders":3,"revenue":"870.00"}]}`, rec.Body.String())
			}
		})
	}
}
