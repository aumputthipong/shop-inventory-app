package line

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
)

type Ordering interface {
	Settings() Settings
	Catalog(ctx context.Context) ([]CatalogItem, error)
	PlaceOrder(ctx context.Context, in OrderInput) (orders.Order, error)
}

// Handler serves the customer-facing LINE order form. Its routes are public:
// customers prove who they are with a LINE ID token, not a staff session.
type Handler struct {
	svc Ordering
}

func NewHandler(svc Ordering) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(r gin.IRouter) {
	r.GET("/api/line/settings", h.settings)
	r.GET("/api/line/catalog", h.catalog)
	r.POST("/api/line/orders", h.placeOrder)
}

type settingsResponse struct {
	Mode   string `json:"mode"`
	LIFFID string `json:"liff_id"`
}

type catalogItemResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Price     string `json:"price"`
	Status    string `json:"stock_status"`
	Available *int32 `json:"available"`
}

type orderItemRequest struct {
	ProductID int64 `json:"product_id" binding:"required,gte=1"`
	Qty       int32 `json:"qty" binding:"required,gte=1,lte=100"`
}

type placeOrderRequest struct {
	IDToken string             `json:"id_token" binding:"required"`
	Name    string             `json:"name" binding:"max=100"`
	Phone   string             `json:"phone" binding:"max=20"`
	Address string             `json:"address" binding:"max=500"`
	Note    string             `json:"note" binding:"max=500"`
	Items   []orderItemRequest `json:"items" binding:"required,min=1,max=20,dive"`
}

type receiptItemResponse struct {
	Name      string `json:"name"`
	Qty       int32  `json:"qty"`
	UnitPrice string `json:"unit_price"`
}

type receiptResponse struct {
	OrderNo string                `json:"order_no"`
	Status  string                `json:"status"`
	Total   string                `json:"total"`
	Items   []receiptItemResponse `json:"items"`
}

type shortageResponse struct {
	ProductID int64  `json:"product_id"`
	Name      string `json:"name"`
	Requested int32  `json:"requested"`
	Available int32  `json:"available"`
}

type shortageDetails struct {
	Items []shortageResponse `json:"items"`
}

func (h *Handler) settings(c *gin.Context) {
	c.JSON(http.StatusOK, settingsResponse(h.svc.Settings()))
}

func (h *Handler) catalog(c *gin.Context) {
	items, err := h.svc.Catalog(c.Request.Context())
	if errors.Is(err, ErrDisabled) {
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, err.Error())
		return
	}
	if err != nil {
		httpx.RespondInternal(c, err)
		return
	}
	out := make([]catalogItemResponse, 0, len(items))
	for _, it := range items {
		out = append(out, catalogItemResponse{
			ID: it.ID, Name: it.Name, Price: it.Price, Status: string(it.Status), Available: it.Available,
		})
	}
	c.JSON(http.StatusOK, gin.H{"items": out})
}

func (h *Handler) placeOrder(c *gin.Context) {
	var req placeOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondBindError(c, err)
		return
	}
	items := make([]orders.ItemRequest, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, orders.ItemRequest(it))
	}

	o, err := h.svc.PlaceOrder(c.Request.Context(), OrderInput{
		IDToken: req.IDToken, Name: req.Name, Phone: req.Phone, Address: req.Address, Note: req.Note, Items: items,
	})

	var customer *CustomerError
	var shortage *orders.InsufficientStockError
	switch {
	case errors.Is(err, ErrDisabled):
		httpx.RespondError(c, http.StatusNotFound, httpx.CodeNotFound, err.Error())
	case errors.Is(err, ErrInvalidToken):
		httpx.RespondError(c, http.StatusUnauthorized, httpx.CodeUnauthorized, err.Error())
	case errors.As(err, &customer):
		httpx.RespondFieldError(c, customer.Field, "is missing or invalid")
	case errors.As(err, &shortage):
		out := make([]shortageResponse, 0, len(shortage.Items))
		for _, s := range shortage.Items {
			out = append(out, shortageResponse{ProductID: s.ProductID, Name: s.Name, Requested: s.Requested, Available: s.Available})
		}
		httpx.RespondErrorDetails(c, http.StatusConflict, httpx.CodeInsufficientStock,
			"some items sold out while you were ordering", shortageDetails{Items: out})
	case errors.Is(err, orders.ErrProductUnavailable), errors.Is(err, orders.ErrInvalidOrder):
		httpx.RespondFieldError(c, "items", "contains a product that cannot be ordered")
	case err != nil:
		httpx.RespondInternal(c, err)
	default:
		out := make([]receiptItemResponse, 0, len(o.Items))
		for _, it := range o.Items {
			out = append(out, receiptItemResponse{Name: it.Name, Qty: it.Qty, UnitPrice: it.UnitPrice})
		}
		c.JSON(http.StatusCreated, receiptResponse{OrderNo: o.OrderNo, Status: string(o.Status), Total: o.Total, Items: out})
	}
}
