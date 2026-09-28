package users

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Manager interface {
	List(ctx context.Context) ([]User, error)
	Create(ctx context.Context, in NewUser) (User, error)
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
}

type createRequest struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Name     string `json:"name" binding:"required,max=100"`
	Role     string `json:"role" binding:"required,oneof=owner staff"`
	Password string `json:"password" binding:"required,max=200"`
}

type userResponse struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type listResponse struct {
	Items []userResponse `json:"items"`
}

func toResponse(u User) userResponse {
	return userResponse{ID: u.ID, Email: u.Email, Name: u.Name, Role: string(u.Role), CreatedAt: u.CreatedAt}
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
	switch {
	case errors.Is(err, ErrEmailTaken):
		httpx.RespondError(c, http.StatusConflict, httpx.CodeConflict, "this email already has an account")
	case errors.Is(err, ErrWeakPassword):
		httpx.RespondFieldError(c, "password", "must be at least 8 characters")
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.JSON(http.StatusCreated, toResponse(u))
	}
}
