package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const pingTimeout = 2 * time.Second

const (
	StatusOK       = "ok"
	StatusDegraded = "degraded"
	StatusError    = "error"
)

type Pinger interface {
	Ping(ctx context.Context) error
}

type Response struct {
	Status string `json:"status"`
	DB     string `json:"db"`
}

type Handler struct {
	db Pinger
}

func NewHandler(db Pinger) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Register(router gin.IRouter) {
	router.GET("/healthz", h.Healthz)
}

func (h *Handler) Healthz(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), pingTimeout)
	defer cancel()

	if err := h.db.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, Response{
			Status: StatusDegraded,
			DB:     StatusError,
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Status: StatusOK,
		DB:     StatusOK,
	})
}
