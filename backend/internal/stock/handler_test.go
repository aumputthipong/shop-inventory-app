package stock_test

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type roleSessions struct{}

func (roleSessions) ResolveSession(_ context.Context, token string) (actor.Actor, error) {
	return actor.Actor{UserID: 1, Role: actor.Role(token)}, nil
}

type okOperator struct {
	stock.Operator
}

func (okOperator) StockIn(context.Context, stock.ReceiptInput) (stock.Balance, error) {
	return stock.Balance{OnHand: 1}, nil
}

func (okOperator) Adjust(context.Context, stock.AdjustInput) (stock.Balance, error) {
	return stock.Balance{OnHand: 1}, nil
}

func (okOperator) Reverse(context.Context, int64) (stock.Balance, error) {
	return stock.Balance{ProductID: 1, OnHand: 1}, nil
}

func (okOperator) Receive(_ context.Context, in stock.NewReceipt) (stock.Receipt, error) {
	return stock.Receipt{ID: 1, Lines: []stock.ReceivedLine{{ProductID: in.Lines[0].ProductID, Qty: in.Lines[0].Qty}}}, nil
}

func TestRolesOnStockEndpoints(t *testing.T) {
	tests := []struct {
		name       string
		role       actor.Role
		path       string
		body       string
		wantStatus int
	}{
		{"staff can receive stock", actor.RoleStaff, "/api/products/1/stock-in", `{"qty":3}`, http.StatusOK},
		{"staff cannot adjust", actor.RoleStaff, "/api/products/1/adjustments", `{"qty_change":-1,"reason":"lost"}`, http.StatusForbidden},
		{"owner can adjust", actor.RoleOwner, "/api/products/1/adjustments", `{"qty_change":-1,"reason":"lost"}`, http.StatusOK},
		{"adjust needs a reason", actor.RoleOwner, "/api/products/1/adjustments", `{"qty_change":-1}`, http.StatusUnprocessableEntity},
		{"staff cannot reverse a movement", actor.RoleStaff, "/api/movements/7/reverse", "", http.StatusForbidden},
		{"owner can reverse a movement", actor.RoleOwner, "/api/movements/7/reverse", "", http.StatusOK},
		{"staff can receive a delivery", actor.RoleStaff, "/api/receipts", `{"reference":"INV-1","lines":[{"product_id":1,"qty":3}]}`, http.StatusCreated},
		{"a delivery needs lines", actor.RoleStaff, "/api/receipts", `{"lines":[]}`, http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := httpx.NewRouter(httpx.RouterConfig{
				Logger:    slog.New(slog.DiscardHandler),
				GinMode:   config.GinModeTest,
				Protected: []httpx.Route{stock.NewHandler(okOperator{})},
				Sessions:  roleSessions{},
			})
			req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, tt.path, strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req.AddCookie(&http.Cookie{Name: httpx.SessionCookie, Value: string(tt.role)})
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code, rec.Body.String())
		})
	}
}
