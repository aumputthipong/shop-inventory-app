package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Authenticator interface {
	Login(ctx context.Context, email, password string) (Session, error)
	Logout(ctx context.Context, token string) error
}

type Handler struct {
	svc          Authenticator
	secureCookie bool
}

func NewHandler(svc Authenticator, secureCookie bool) *Handler {
	return &Handler{svc: svc, secureCookie: secureCookie}
}

func (h *Handler) Register(r gin.IRouter) {
	r.POST("/api/auth/login", h.login)
	r.POST("/api/auth/logout", h.logout)
}

// Me is registered behind RequireAuth.
func (h *Handler) Me() httpx.Route {
	return meRoute{}
}

type meRoute struct{}

func (meRoute) Register(r gin.IRouter) {
	r.GET("/api/auth/me", func(c *gin.Context) {
		a, _ := actor.From(c.Request.Context())
		c.JSON(http.StatusOK, userResponse{ID: a.UserID, Email: a.Email, Name: a.Name, Role: string(a.Role)})
	})
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Password string `json:"password" binding:"required,max=200"`
}

type userResponse struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}

	session, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		httpx.RespondError(c, http.StatusUnauthorized, httpx.CodeInvalidCredentials, "email or password is incorrect")
		return
	}
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}

	h.setCookie(c, session.Token, int(time.Until(session.ExpiresAt).Seconds()))
	u := session.User
	c.JSON(http.StatusOK, userResponse{ID: u.ID, Email: u.Email, Name: u.Name, Role: string(u.Role)})
}

func (h *Handler) logout(c *gin.Context) {
	if token, err := c.Cookie(httpx.SessionCookie); err == nil && token != "" {
		if err := h.svc.Logout(c.Request.Context(), token); err != nil {
			httpx.RespondInternal(c, err)
			return
		}
	}
	h.setCookie(c, "", -1)
	c.Status(http.StatusNoContent)
}

func (h *Handler) setCookie(c *gin.Context, value string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(httpx.SessionCookie, value, maxAge, "/", "", h.secureCookie, true)
}
