package auth_test

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
)

type noAuth struct {
	auth.Authenticator
}

func TestDemoAccounts(t *testing.T) {
	tests := []struct {
		name     string
		accounts []auth.DemoAccount
		want     string
	}{
		{"a normal shop shows none", nil, `{"items":[]}`},
		{
			"a public demo lists its sign-ins",
			[]auth.DemoAccount{{Role: "owner", Email: "owner@demo.shop", Password: "demo-owner-2026"}},
			`{"items":[{"role":"owner","email":"owner@demo.shop","password":"demo-owner-2026"}]}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := httpx.NewRouter(httpx.RouterConfig{
				Logger:  slog.New(slog.DiscardHandler),
				GinMode: config.GinModeTest,
				Routes:  []httpx.Route{auth.NewHandler(noAuth{}, false).WithDemoAccounts(tt.accounts)},
			})
			req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/auth/demo-accounts", nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			assert.Equal(t, http.StatusOK, rec.Code)
			assert.JSONEq(t, tt.want, rec.Body.String())
		})
	}
}
