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
	ChangePassword(ctx context.Context, token, current, next string) error
}

type Handler struct {
	svc          Authenticator
	secureCookie bool
	demo         []DemoAccount
}

// DemoAccount is a public sign-in for a demo deployment; empty everywhere else.
type DemoAccount struct {
	Role     string `json:"role"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func NewHandler(svc Authenticator, secureCookie bool) *Handler {
	return &Handler{svc: svc, secureCookie: secureCookie}
}

func (h *Handler) WithDemoAccounts(accounts []DemoAccount) *Handler {
	h.demo = accounts
	return h
}

func (h *Handler) Register(r gin.IRouter) {
	r.POST("/api/auth/login", h.login)
	r.POST("/api/auth/logout", h.logout)
	r.GET("/api/auth/demo-accounts", h.demoAccounts)
}

func (h *Handler) demoAccounts(c *gin.Context) {
	items := h.demo
	if items == nil {
		items = []DemoAccount{}
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// Protected is registered behind RequireAuth.
func (h *Handler) Protected() httpx.Route {
	return protectedRoutes{h}
}

type protectedRoutes struct {
	h *Handler
}

func (p protectedRoutes) Register(r gin.IRouter) {
	r.GET("/api/auth/me", func(c *gin.Context) {
		a, _ := actor.From(c.Request.Context())
		c.JSON(http.StatusOK, userResponse{ID: a.UserID, Email: a.Email, Name: a.Name, Role: string(a.Role)})
	})
	r.POST("/api/auth/password", p.h.changePassword)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required,max=200"`
	NewPassword     string `json:"new_password" binding:"required,max=200"`
}

func (h *Handler) changePassword(c *gin.Context) {
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	token, _ := c.Cookie(httpx.SessionCookie)

	err := h.svc.ChangePassword(c.Request.Context(), token, req.CurrentPassword, req.NewPassword)
	switch {
	case errors.Is(err, ErrWrongPassword):
		httpx.RespondFieldError(c, "current_password", "is not your current password")
	case errors.Is(err, ErrWeakPassword):
		httpx.RespondFieldError(c, "new_password", "must be at least 8 characters")
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.Status(http.StatusNoContent)
	}
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
	if errors.Is(err, ErrAccountDisabled) {
		httpx.RespondError(c, http.StatusForbidden, httpx.CodeAccountDisabled, "this account has been disabled")
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
