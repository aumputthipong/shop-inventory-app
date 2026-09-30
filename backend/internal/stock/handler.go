package stock

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Operator interface {
	StockIn(ctx context.Context, in ReceiptInput) (Balance, error)
	Adjust(ctx context.Context, in AdjustInput) (Balance, error)
	ListMovements(ctx context.Context, f MovementFilter) ([]Movement, int64, error)
	Reverse(ctx context.Context, movementID int64) (Balance, error)
}

type Handler struct {
	svc Operator
}

func NewHandler(svc Operator) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	r.POST("/api/products/:id/stock-in", h.stockIn)
	r.POST("/api/products/:id/adjustments", httpx.RequireRole(actor.RoleOwner), h.adjust)
	r.GET("/api/movements", h.listMovements)
	r.POST("/api/movements/:id/reverse", httpx.RequireRole(actor.RoleOwner), h.reverse)
}

type stockInRequest struct {
	Qty  int32  `json:"qty" binding:"required,gte=1,lte=100000"`
	Note string `json:"note" binding:"max=500"`
}

type adjustRequest struct {
	QtyChange int32  `json:"qty_change" binding:"required,ne=0,gte=-100000,lte=100000"`
	Reason    string `json:"reason" binding:"required,oneof=count_correction damaged lost other"`
	Note      string `json:"note" binding:"max=500"`
}

type balanceResponse struct {
	ProductID int64 `json:"product_id"`
	OnHand    int32 `json:"on_hand"`
	Reserved  int32 `json:"reserved"`
	Available int32 `json:"available"`
}

type shortageDetails struct {
	Requested int32 `json:"requested"`
	Available int32 `json:"available"`
	Reserved  int32 `json:"reserved"`
}

type movementResponse struct {
	ID             int64     `json:"id"`
	ProductID      int64     `json:"product_id"`
	SKU            string    `json:"sku"`
	ProductName    string    `json:"product_name"`
	Type           string    `json:"type"`
	QtyChange      int32     `json:"qty_change"`
	ReservedChange int32     `json:"reserved_change"`
	OnHandAfter    int32     `json:"on_hand_after"`
	ReservedAfter  int32     `json:"reserved_after"`
	AvailableAfter int32     `json:"available_after"`
	OrderID        *int64    `json:"order_id"`
	OrderNo        *string   `json:"order_no"`
	OrderChannel   *string   `json:"order_channel"`
	CountID        *int64    `json:"count_id"`
	Reason         *string   `json:"reason"`
	Note           *string   `json:"note"`
	CreatedByName  *string   `json:"created_by_name"`
	CreatedAt      time.Time `json:"created_at"`
	ReversesID     *int64    `json:"reverses_id"`
	Reversed       bool      `json:"reversed"`
}

type movementListResponse struct {
	Items []movementResponse `json:"items"`
	Total int64              `json:"total"`
}

func (h *Handler) stockIn(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	var req stockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}

	b, err := h.svc.StockIn(c.Request.Context(), ReceiptInput{ProductID: id, Qty: req.Qty, Note: req.Note})
	h.respondBalance(c, id, b, err)
}

func (h *Handler) adjust(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	var req adjustRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}

	b, err := h.svc.Adjust(c.Request.Context(), AdjustInput{
		ProductID: id, QtyChange: req.QtyChange, Reason: AdjustReason(req.Reason), Note: req.Note,
	})
	h.respondBalance(c, id, b, err)
}

type stateDetails struct {
	Reason string `json:"reason"`
}

func (h *Handler) reverse(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	b, err := h.svc.Reverse(c.Request.Context(), id)
	state := map[error]string{
		ErrAlreadyReversed: "already_reversed", ErrNotReversible: "not_reversible", ErrTooOld: "too_old",
	}
	for known, reason := range state {
		if errors.Is(err, known) {
			httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInvalidState, err.Error(), stateDetails{Reason: reason})
			return
		}
	}
	if errors.Is(err, ErrMovementNotFound) {
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "movement not found")
		return
	}
	h.respondBalance(c, b.ProductID, b, err)
}

func (h *Handler) respondBalance(c *gin.Context, productID int64, b Balance, err error) {
	var shortage *ShortageError
	switch {
	case errors.As(err, &shortage):
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInsufficientStock,
			"not enough available stock", shortageDetails(*shortage))
	case errors.Is(err, ErrInsufficientStock):
		httpx.RespondError(c, http.StatusConflict, httpx.CodeInsufficientStock, "not enough available stock")
	case errors.Is(err, ErrProductNotFound):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "product not found")
	case errors.Is(err, ErrNoteRequired):
		httpx.RespondFieldError(c, "note", "is required when the reason is other")
	case errors.Is(err, ErrInvalidQty), errors.Is(err, ErrInvalidReason):
		httpx.RespondFieldError(c, "qty", err.Error())
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.JSON(http.StatusOK, balanceResponse{
			ProductID: productID, OnHand: b.OnHand, Reserved: b.Reserved, Available: b.Available(),
		})
	}
}

func (h *Handler) listMovements(c *gin.Context) {
	page := httpx.PageFrom(c)
	f := MovementFilter{Limit: page.Limit, Offset: page.Offset}
	if raw := c.Query("product_id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			httpx.RespondFieldError(c, "product_id", "must be a number")
			return
		}
		f.ProductID = &id
	}
	if raw := c.Query("type"); raw != "" {
		t := MovementType(raw)
		f.Type = &t
	}

	items, total, err := h.svc.ListMovements(c.Request.Context(), f)
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}

	out := make([]movementResponse, 0, len(items))
	for _, m := range items {
		var orderID, countID *int64
		if m.RefType != nil && *m.RefType == RefOrder {
			orderID = m.RefID
		}
		if m.RefType != nil && *m.RefType == RefStockCount {
			countID = m.RefID
		}
		out = append(out, movementResponse{
			ID:             m.ID,
			ProductID:      m.ProductID,
			SKU:            m.SKU,
			ProductName:    m.ProductName,
			Type:           string(m.Type),
			QtyChange:      m.QtyChange,
			ReservedChange: m.ReservedChange,
			OnHandAfter:    m.OnHandAfter,
			ReservedAfter:  m.ReservedAfter,
			AvailableAfter: m.OnHandAfter - m.ReservedAfter,
			OrderID:        orderID,
			OrderNo:        m.OrderNo,
			OrderChannel:   m.OrderChannel,
			CountID:        countID,
			Reason:         m.Reason,
			Note:           m.Note,
			CreatedByName:  m.CreatedByName,
			CreatedAt:      m.CreatedAt,
			ReversesID:     m.ReversesID,
			Reversed:       m.Reversed,
		})
	}
	c.JSON(http.StatusOK, movementListResponse{Items: out, Total: total})
}
