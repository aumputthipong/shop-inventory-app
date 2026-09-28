package users

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Manager interface {
	List(ctx context.Context) ([]User, error)
	Create(ctx context.Context, in NewUser) (User, error)
	SetActive(ctx context.Context, id int64, active bool) (User, error)
	ResetPassword(ctx context.Context, id int64, password string) error
}

type Handler struct {
	svc Manager
}

func NewHandler(svc Manager) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	owner := httpx.RequireRole(actor.RoleOwner)
	r.GET("/api/users", owner, h.list)
	r.POST("/api/users", owner, h.create)
	r.PATCH("/api/users/:id", owner, h.update)
	r.POST("/api/users/:id/password", owner, h.resetPassword)
}

type createRequest struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Name     string `json:"name" binding:"required,max=100"`
	Role     string `json:"role" binding:"required,oneof=owner staff"`
	Password string `json:"password" binding:"required,max=200"`
}

type updateRequest struct {
	IsActive *bool `json:"is_active" binding:"required"`
}

type passwordRequest struct {
	Password string `json:"password" binding:"required,max=200"`
}

type userResponse struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type listResponse struct {
	Items []userResponse `json:"items"`
}

type stateDetails struct {
	Reason string `json:"reason"`
}

func toResponse(u User) userResponse {
	return userResponse{
		ID: u.ID, Email: u.Email, Name: u.Name, Role: string(u.Role), IsActive: u.Active, CreatedAt: u.CreatedAt,
	}
}

func (h *Handler) list(c *gin.Context) {
	users, err := h.svc.List(c.Request.Context())
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}
	items := make([]userResponse, 0, len(users))
	for _, u := range users {
		items = append(items, toResponse(u))
	}
	c.JSON(http.StatusOK, listResponse{Items: items})
}

func (h *Handler) create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}

	u, err := h.svc.Create(c.Request.Context(), NewUser{
		Email: req.Email, Name: req.Name, Role: actor.Role(req.Role), Password: req.Password,
	})
	if respondError(c, err) {
		return
	}
	c.JSON(http.StatusCreated, toResponse(u))
}

func (h *Handler) update(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	var req updateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	u, err := h.svc.SetActive(c.Request.Context(), id, *req.IsActive)
	if respondError(c, err) {
		return
	}
	c.JSON(http.StatusOK, toResponse(u))
}

func (h *Handler) resetPassword(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	var req passwordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	if respondError(c, h.svc.ResetPassword(c.Request.Context(), id, req.Password)) {
		return
	}
	c.Status(http.StatusNoContent)
}

func respondError(c *gin.Context, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, ErrEmailTaken):
		httpx.RespondError(c, http.StatusConflict, httpx.CodeConflict, "this email already has an account")
	case errors.Is(err, auth.ErrWeakPassword):
		httpx.RespondFieldError(c, "password", "must be at least 8 characters")
	case errors.Is(err, ErrNotFound):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "user not found")
	case errors.Is(err, ErrSelf):
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInvalidState, err.Error(), stateDetails{Reason: "self"})
	case errors.Is(err, ErrLastOwner):
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInvalidState, err.Error(), stateDetails{Reason: "last_owner"})
	default:
		httpx.RespondInternal(c, err)
	}
	return true
}
