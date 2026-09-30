package counts_test

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/counts"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type roleSessions struct{}

func (roleSessions) ResolveSession(_ context.Context, token string) (actor.Actor, error) {
	return actor.Actor{UserID: 1, Role: actor.Role(token)}, nil
}

func TestCountEndpoints(t *testing.T) {
	tests := []struct {
		name       string
		role       actor.Role
		path       string
		body       string
		wantStatus int
	}{
		{"staff can submit a count", actor.RoleStaff, "/api/counts", `{"lines":[{"product_id":1,"counted":0}]}`, http.StatusCreated},
		{"counted is required", actor.RoleStaff, "/api/counts", `{"lines":[{"product_id":1}]}`, http.StatusUnprocessableEntity},
		{"staff cannot approve while submitting", actor.RoleStaff, "/api/counts", `{"approve":true,"lines":[{"product_id":1,"counted":2}]}`, http.StatusForbidden},
		{"staff cannot approve", actor.RoleStaff, "/api/counts/1/approve", "", http.StatusForbidden},
		{"staff cannot reject", actor.RoleStaff, "/api/counts/1/reject", "", http.StatusForbidden},
		{"owner can approve", actor.RoleOwner, "/api/counts/1/approve", "", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := httpx.NewRouter(httpx.RouterConfig{
				Logger:    slog.New(slog.DiscardHandler),
				GinMode:   config.GinModeTest,
				Protected: []httpx.Route{counts.NewHandler(counts.NewService(&fakeRepo{}))},
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
