package httpx

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

const SessionCookie = "sid"

type SessionResolver interface {
	ResolveSession(ctx context.Context, token string) (actor.Actor, error)
}

func RequireAuth(sessions SessionResolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(SessionCookie)
		if err != nil || token == "" {
			RespondError(c, http.StatusUnauthorized, CodeUnauthorized, "sign in required")
			return
		}

		a, err := sessions.ResolveSession(c.Request.Context(), token)
		if errors.Is(err, actor.ErrNoSession) {
			RespondError(c, http.StatusUnauthorized, CodeUnauthorized, "session expired, sign in again")
			return
		}
		if err != nil {
			RespondInternal(c, err)
			return
		}

		c.Request = c.Request.WithContext(actor.With(c.Request.Context(), a))
		c.Next()
	}
}

func RequireRole(roles ...actor.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		a, ok := actor.From(c.Request.Context())
		if !ok {
			RespondError(c, http.StatusUnauthorized, CodeUnauthorized, "sign in required")
			return
		}
		if !slices.Contains(roles, a.Role) {
			RespondError(c, http.StatusForbidden, CodeForbidden, "your role cannot do this")
			return
		}
		c.Next()
	}
}
