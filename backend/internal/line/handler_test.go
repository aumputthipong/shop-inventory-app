package line_test

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/line"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
)

func TestLineEndpoints(t *testing.T) {
	order := `{"id_token":"dev:ploy","name":"พลอย","phone":"0812345678","address":"กรุงเทพ","items":[{"product_id":1,"qty":1}]}`
	shortage := &orders.InsufficientStockError{Items: []orders.Shortage{{ProductID: 1, Name: "เสื้อยืด", Requested: 1, Available: 0}}}

	tests := []struct {
		name       string
		mode       string
		ordersErr  error
		method     string
		path       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{"settings tell the form which mode it is in", line.ModeDev, nil, http.MethodGet, "/api/line/settings", "", http.StatusOK, `"mode":"dev"`},
		{"catalog needs no staff session", line.ModeDev, nil, http.MethodGet, "/api/line/catalog", "", http.StatusOK, `"stock_status":"in_stock"`},
		{"an order needs no staff session", line.ModeDev, nil, http.MethodPost, "/api/line/orders", order, http.StatusCreated, `"order_no":"ORD-2026-00042"`},
		{"a forged token is unauthorized", line.ModeDev, nil, http.MethodPost, "/api/line/orders", strings.Replace(order, "dev:ploy", "forged", 1), http.StatusUnauthorized, "unauthorized"},
		{"a bad phone points at the field", line.ModeDev, nil, http.MethodPost, "/api/line/orders", strings.Replace(order, "0812345678", "12", 1), http.StatusUnprocessableEntity, `"field":"phone"`},
		{"a sold-out item says which one", line.ModeDev, shortage, http.MethodPost, "/api/line/orders", order, http.StatusConflict, `"name":"เสื้อยืด"`},
		{"turned off answers not found", line.ModeOff, nil, http.MethodGet, "/api/line/catalog", "", http.StatusNotFound, "turned off"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := newService(tt.mode, &fakeOrders{err: tt.ordersErr})
			router := httpx.NewRouter(httpx.RouterConfig{
				Logger:  slog.New(slog.DiscardHandler),
				GinMode: config.GinModeTest,
				Routes:  []httpx.Route{line.NewHandler(svc)},
			})
			req := httptest.NewRequestWithContext(t.Context(), tt.method, tt.path, strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code, rec.Body.String())
			assert.Contains(t, rec.Body.String(), tt.wantBody)
		})
	}
}
