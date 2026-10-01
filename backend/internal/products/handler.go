package products

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type Catalog interface {
	List(ctx context.Context, search string) ([]Product, error)
	Get(ctx context.Context, id int64) (Detail, error)
	Create(ctx context.Context, in Input) (Detail, error)
	Update(ctx context.Context, id int64, patch Patch) (Detail, error)
}

type Handler struct {
	svc Catalog
}

func NewHandler(svc Catalog) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	owner := httpx.RequireRole(actor.RoleOwner)
	r.GET("/api/products", h.list)
	r.GET("/api/products/:id", h.get)
	r.POST("/api/products", owner, h.create)
	r.PATCH("/api/products/:id", owner, h.update)
}

type createRequest struct {
	SKU               string `json:"sku" binding:"required,max=40"`
	Name              string `json:"name" binding:"required,max=200"`
	Price             string `json:"price" binding:"required,max=16"`
	LowStockThreshold int32  `json:"low_stock_threshold" binding:"gte=0,lte=100000"`
	IsActive          *bool  `json:"is_active"`
	InitialQty        int32  `json:"initial_qty" binding:"gte=0,lte=100000"`
}

type updateRequest struct {
	SKU               *string `json:"sku" binding:"omitempty,max=40"`
	Name              *string `json:"name" binding:"omitempty,max=200"`
	Price             *string `json:"price" binding:"omitempty,max=16"`
	LowStockThreshold *int32  `json:"low_stock_threshold" binding:"omitempty,gte=0,lte=100000"`
	IsActive          *bool   `json:"is_active"`
}

type productResponse struct {
	ID                int64     `json:"id"`
	SKU               string    `json:"sku"`
	Name              string    `json:"name"`
	Price             string    `json:"price"`
	LowStockThreshold int32     `json:"low_stock_threshold"`
	IsActive          bool      `json:"is_active"`
	OnHand            int32     `json:"on_hand"`
	Reserved          int32     `json:"reserved"`
	Available         int32     `json:"available"`
	StockStatus       string    `json:"stock_status"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type holdResponse struct {
	OrderID   int64     `json:"order_id"`
	OrderNo   string    `json:"order_no"`
	Channel   string    `json:"channel"`
	Status    string    `json:"status"`
	Qty       int32     `json:"qty"`
	CreatedAt time.Time `json:"created_at"`
}

type detailResponse struct {
	productResponse
	Holds []holdResponse `json:"holds"`
}

type listResponse struct {
	Items []productResponse `json:"items"`
}

func toProduct(p Product) productResponse {
	return productResponse{
		ID: p.ID, SKU: p.SKU, Name: p.Name, Price: p.Price,
		LowStockThreshold: p.LowStockThreshold, IsActive: p.IsActive,
		OnHand: p.OnHand, Reserved: p.Reserved, Available: p.Available(),
		StockStatus: string(p.Status()), CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
	}
}

func toDetail(d Detail) detailResponse {
	holds := make([]holdResponse, 0, len(d.Holds))
	for _, h := range d.Holds {
		holds = append(holds, holdResponse(h))
	}
	return detailResponse{productResponse: toProduct(d.Product), Holds: holds}
}

func (h *Handler) list(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), c.Query("q"))
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}
	out := make([]productResponse, 0, len(items))
	for _, p := range items {
		out = append(out, toProduct(p))
	}
	c.JSON(http.StatusOK, listResponse{Items: out})
}

func (h *Handler) get(c *gin.Context) {
	id, ok := httpx.PathID(c, "id")
	if !ok {
		return
	}
	d, err := h.svc.Get(c.Request.Context(), id)
	respond(c, http.StatusOK, d, err)
}

func (h *Handler) create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	d, err := h.svc.Create(c.Request.Context(), Input{
		SKU: req.SKU, Name: req.Name, Price: req.Price,
		LowStockThreshold: req.LowStockThreshold, IsActive: active, InitialQty: req.InitialQty,
	})
	respond(c, http.StatusCreated, d, err)
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
	d, err := h.svc.Update(c.Request.Context(), id, Patch(req))
	respond(c, http.StatusOK, d, err)
}

func respond(c *gin.Context, status int, d Detail, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, "product not found")
	case errors.Is(err, ErrSKUTaken):
		httpx.RespondError(c, http.StatusConflict, httpx.CodeConflict, "another product already uses this SKU")
	case errors.Is(err, ErrInvalidSKU):
		httpx.RespondFieldError(c, "sku", err.Error())
	case errors.Is(err, ErrInvalidName):
		httpx.RespondFieldError(c, "name", err.Error())
	case errors.Is(err, ErrInvalidPrice):
		httpx.RespondFieldError(c, "price", err.Error())
	case errors.Is(err, ErrInvalidQty):
		httpx.RespondFieldError(c, "initial_qty", err.Error())
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		c.JSON(status, toDetail(d))
	}
}
