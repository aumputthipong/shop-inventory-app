package counts

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
	Create(ctx context.Context, in NewCount) (Count, error)
	Approve(ctx context.Context, id int64) (Count, error)
	Reject(ctx context.Context, id int64) (Count, error)
	Get(ctx context.Context, id int64) (Count, error)
	List(ctx context.Context, f Filter) ([]Summary, int64, error)
}

type Handler struct {
	svc Manager
}

func NewHandler(svc Manager) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	r.GET("/api/counts", h.list)
	r.POST("/api/counts", h.create)
	r.GET("/api/counts/:id", h.get)
	r.POST("/api/counts/:id/approve", httpx.RequireRole(actor.RoleOwner), h.decide(h.svc.Approve))
	r.POST("/api/counts/:id/reject", httpx.RequireRole(actor.RoleOwner), h.decide(h.svc.Reject))
}

type lineRequest struct {
	ProductID int64  `json:"product_id" binding:"required,gte=1"`
	Counted   *int32 `json:"counted" binding:"required,gte=0,lte=100000"`
}

type createRequest struct {
	Note    string        `json:"note" binding:"max=500"`
	Approve bool          `json:"approve"`
	Lines   []lineRequest `json:"lines" binding:"required,min=1,max=500,dive"`
}

type lineResponse struct {
	ProductID int64  `json:"product_id"`
	SKU       string `json:"sku"`
	Name      string `json:"name"`
	Expected  int32  `json:"expected"`
	Counted   int32  `json:"counted"`
	Variance  int32  `json:"variance"`
	OnHandNow int32  `json:"on_hand_now"`
}

type countResponse struct {
	ID            int64          `json:"id"`
	Status        string         `json:"status"`
	Note          *string        `json:"note"`
	CreatedByName *string        `json:"created_by_name"`
	DecidedByName *string        `json:"decided_by_name"`
	CreatedAt     time.Time      `json:"created_at"`
	DecidedAt     *time.Time     `json:"decided_at"`
	Lines         []lineResponse `json:"lines"`
}

type summaryResponse struct {
	ID            int64      `json:"id"`
	Status        string     `json:"status"`
	Note          *string    `json:"note"`
	CreatedByName *string    `json:"created_by_name"`
	CreatedAt     time.Time  `json:"created_at"`
	DecidedAt     *time.Time `json:"decided_at"`
	LineCount     int64      `json:"line_count"`
	DiffCount     int64      `json:"diff_count"`
}

type listResponse struct {
	Items []summaryResponse `json:"items"`
	Total int64             `json:"total"`
}

type shortageResponse struct {
	ProductID int64  `json:"product_id"`
	SKU       string `json:"sku"`
	Name      string `json:"name"`
	Requested int32  `json:"requested"`
	Available int32  `json:"available"`
}

type shortageDetails struct {
	Items []shortageResponse `json:"items"`
}

type stateDetails struct {
	Status string `json:"status"`
}

func (h *Handler) list(c *gin.Context) {
	page := httpx.PageFrom(c)
	f := Filter{Limit: page.Limit, Offset: page.Offset}
	if raw := c.Query("status"); raw != "" {
		s := Status(raw)
		f.Status = &s
	}
	items, total, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}
	out := make([]summaryResponse, 0, len(items))
	for _, s := range items {
		out = append(out, summaryResponse{
			ID: s.ID, Status: string(s.Status), Note: s.Note, CreatedByName: s.CreatedByName,
			CreatedAt: s.CreatedAt, DecidedAt: s.DecidedAt, LineCount: s.LineCount, DiffCount: s.DiffCount,
		})
	}
	c.JSON(http.StatusOK, listResponse{Items: out, Total: total})
}

func (h *Handler) get(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	count, err := h.svc.Get(c.Request.Context(), id)
	respond(c, http.StatusOK, count, err)
}

func (h *Handler) create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	lines := make([]LineInput, 0, len(req.Lines))
	for _, l := range req.Lines {
		lines = append(lines, LineInput{ProductID: l.ProductID, Counted: *l.Counted})
	}
	count, err := h.svc.Create(c.Request.Context(), NewCount{Note: req.Note, Approve: req.Approve, Lines: lines})
	respond(c, http.StatusCreated, count, err)
}

func (h *Handler) decide(fn func(ctx context.Context, id int64) (Count, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := httpx.PathID(c, "id")
		if !ok {
			return
		}
		count, err := fn(c.Request.Context(), id)
		respond(c, http.StatusOK, count, err)
	}
}

func respond(c *gin.Context, status int, count Count, err error) {
	var shortage *InsufficientStockError
	var state *StateError
	switch {
	case errors.As(err, &shortage):
		items := make([]shortageResponse, 0, len(shortage.Items))
		for _, s := range shortage.Items {
			items = append(items, shortageResponse(s))
		}
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInsufficientStock,
			"orders already hold some of the stock this count would remove", shortageDetails{Items: items})
	case errors.As(err, &state):
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInvalidState, state.Error(),
			stateDetails{Status: string(state.Status)})
	case errors.Is(err, ErrNotFound):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "stock count not found")
	case errors.Is(err, ErrOwnerOnly):
		httpx.RespondError(c, http.StatusForbidden, httpx.CodeForbidden, err.Error())
	case errors.Is(err, ErrInvalidCount), errors.Is(err, ErrUnknownProduct):
		httpx.RespondFieldError(c, "lines", err.Error())
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.JSON(status, toResponse(count))
	}
}

func toResponse(count Count) countResponse {
	lines := make([]lineResponse, 0, len(count.Lines))
	for _, l := range count.Lines {
		lines = append(lines, lineResponse{
			ProductID: l.ProductID, SKU: l.SKU, Name: l.Name, Expected: l.Expected,
			Counted: l.Counted, Variance: l.Variance(), OnHandNow: l.OnHandNow,
		})
	}
	return countResponse{
		ID: count.ID, Status: string(count.Status), Note: count.Note,
		CreatedByName: count.CreatedByName, DecidedByName: count.DecidedByName,
		CreatedAt: count.CreatedAt, DecidedAt: count.DecidedAt, Lines: lines,
	}
}
