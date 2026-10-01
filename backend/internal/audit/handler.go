package audit

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Lister interface {
	List(ctx context.Context, limit, offset int32) ([]Log, int64, error)
}

type Handler struct {
	svc Lister
}

func NewHandler(svc Lister) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	r.GET("/api/audit-logs", httpx.RequireRole(actor.RoleOwner), h.list)
}

type logResponse struct {
	ID         int64           `json:"id"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   *int64          `json:"entity_id"`
	Detail     json.RawMessage `json:"detail"`
	ActorName  *string         `json:"actor_name"`
	CreatedAt  time.Time       `json:"created_at"`
}

type listResponse struct {
	Items []logResponse `json:"items"`
	Total int64         `json:"total"`
}

func (h *Handler) list(c *gin.Context) {
	page := httpx.PageFrom(c)
	logs, total, err := h.svc.List(c.Request.Context(), page.Limit, page.Offset)
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}

	items := make([]logResponse, 0, len(logs))
	for _, l := range logs {
		items = append(items, logResponse(l))
	}
	c.JSON(http.StatusOK, listResponse{Items: items, Total: total})
}
