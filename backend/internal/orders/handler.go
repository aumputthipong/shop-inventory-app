package orders

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
)

type Manager interface {
	Create(ctx context.Context, in NewOrder) (Order, error)
	Apply(ctx context.Context, id int64, action Action) (Order, error)
	Get(ctx context.Context, id int64) (Order, error)
	List(ctx context.Context, f Filter) ([]Summary, int64, error)
}

type Handler struct {
	svc Manager
}

func NewHandler(svc Manager) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	r.GET("/api/orders", h.list)
	r.POST("/api/orders", h.create)
	r.GET("/api/orders/:id", h.get)
	r.POST("/api/orders/:id/pack", h.transition(ActionPack))
	r.POST("/api/orders/:id/ship", h.transition(ActionShip))
	r.POST("/api/orders/:id/cancel", h.transition(ActionCancel))
}

type itemRequest struct {
	ProductID int64 `json:"product_id" binding:"required,gte=1"`
	Qty       int32 `json:"qty" binding:"required,gte=1,lte=100000"`
}

type createRequest struct {
	Channel     string           `json:"channel" binding:"omitempty,oneof=store shopee line"`
	ExternalRef string           `json:"external_ref" binding:"max=100"`
	Note        string           `json:"note" binding:"max=500"`
	Items       []itemRequest    `json:"items" binding:"required,min=1,max=50,dive"`
	HandedOver  bool             `json:"handed_over"`
	Customer    *customerRequest `json:"customer"`
}

type customerRequest struct {
	Name    string `json:"name" binding:"max=100"`
	Phone   string `json:"phone" binding:"max=20"`
	Address string `json:"address" binding:"max=500"`
}

type itemResponse struct {
	ProductID int64  `json:"product_id"`
	SKU       string `json:"sku"`
	Name      string `json:"name"`
	Qty       int32  `json:"qty"`
	UnitPrice string `json:"unit_price"`
}

type orderResponse struct {
	ID            int64             `json:"id"`
	OrderNo       string            `json:"order_no"`
	Channel       string            `json:"channel"`
	ExternalRef   *string           `json:"external_ref"`
	Status        string            `json:"status"`
	Total         string            `json:"total"`
	Note          *string           `json:"note"`
	CreatedByName *string           `json:"created_by_name"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
	PackedAt      *time.Time        `json:"packed_at"`
	ShippedAt     *time.Time        `json:"shipped_at"`
	CanceledAt    *time.Time        `json:"canceled_at"`
	Items         []itemResponse    `json:"items"`
	Customer      *customerResponse `json:"customer"`
}

type customerResponse struct {
	Name     string `json:"name"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	FromLine bool   `json:"from_line"`
}

type summaryResponse struct {
	ID            int64     `json:"id"`
	OrderNo       string    `json:"order_no"`
	Channel       string    `json:"channel"`
	ExternalRef   *string   `json:"external_ref"`
	Status        string    `json:"status"`
	Total         string    `json:"total"`
	ItemCount     int32     `json:"item_count"`
	CreatedByName *string   `json:"created_by_name"`
	CreatedAt     time.Time `json:"created_at"`
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

type transitionDetails struct {
	Status string `json:"status"`
	Action string `json:"action"`
}

func toOrder(o Order) orderResponse {
	items := make([]itemResponse, 0, len(o.Items))
	for _, it := range o.Items {
		items = append(items, itemResponse(it))
	}
	return orderResponse{
		ID: o.ID, OrderNo: o.OrderNo, Channel: string(o.Channel), ExternalRef: o.ExternalRef,
		Status: string(o.Status), Total: o.Total, Note: o.Note, CreatedByName: o.CreatedByName,
		CreatedAt: o.CreatedAt, UpdatedAt: o.UpdatedAt,
		PackedAt: o.PackedAt, ShippedAt: o.ShippedAt, CanceledAt: o.CanceledAt,
		Items: items, Customer: toCustomer(o.Customer),
	}
}

func toCustomer(c *Customer) *customerResponse {
	if c == nil {
		return nil
	}
	return &customerResponse{Name: c.Name, Phone: c.Phone, Address: c.Address, FromLine: c.LineUserID != ""}
}

func (h *Handler) list(c *gin.Context) {
	page := httpx.PageFrom(c)
	f := Filter{Search: httpx.QueryString(c, "q"), Limit: page.Limit, Offset: page.Offset}
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
			ID: s.ID, OrderNo: s.OrderNo, Channel: string(s.Channel), ExternalRef: s.ExternalRef,
			Status: string(s.Status), Total: s.Total, ItemCount: s.ItemCount,
			CreatedByName: s.CreatedByName, CreatedAt: s.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, listResponse{Items: out, Total: total})
}

func (h *Handler) get(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	o, err := h.svc.Get(c.Request.Context(), id)
	respond(c, http.StatusOK, o, err)
}

func (h *Handler) create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}

	items := make([]ItemRequest, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, ItemRequest(it))
	}
	in := NewOrder{
		Channel: Channel(req.Channel), ExternalRef: req.ExternalRef, Note: req.Note, Items: items,
		HandedOver: req.HandedOver,
	}
	if cr := req.Customer; cr != nil {
		in.Customer = &Customer{Name: cr.Name, Phone: cr.Phone, Address: cr.Address}
	}
	o, err := h.svc.Create(c.Request.Context(), in)
	respond(c, http.StatusCreated, o, err)
}

func (h *Handler) transition(action Action) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := httpx.PathID(c, "id")
		if !ok {
			return
		}
		o, err := h.svc.Apply(c.Request.Context(), id, action)
		respond(c, http.StatusOK, o, err)
	}
}

func respond(c *gin.Context, status int, o Order, err error) {
	var shortage *InsufficientStockError
	var transition *TransitionError
	switch {
	case errors.As(err, &shortage):
		items := make([]shortageResponse, 0, len(shortage.Items))
		for _, s := range shortage.Items {
			items = append(items, shortageResponse(s))
		}
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInsufficientStock,
			"stock changed and some items no longer have enough available", shortageDetails{Items: items})
	case errors.As(err, &transition):
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInvalidState, transition.Error(),
			transitionDetails{Status: string(transition.From), Action: string(transition.Action)})
	case errors.Is(err, ErrNotFound):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "order not found")
	case errors.Is(err, ErrExternalRefTaken):
		httpx.RespondError(c, http.StatusConflict, httpx.CodeConflict, "this channel order was already recorded")
	case errors.Is(err, ErrExternalRefMissing):
		httpx.RespondFieldError(c, "external_ref", err.Error())
	case errors.Is(err, ErrCustomerMissing):
		httpx.RespondFieldError(c, "customer", err.Error())
	case errors.Is(err, ErrProductUnavailable):
		httpx.RespondFieldError(c, "items", err.Error())
	case errors.Is(err, ErrInvalidOrder):
		httpx.RespondFieldError(c, "items", err.Error())
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.JSON(status, toOrder(o))
	}
}
