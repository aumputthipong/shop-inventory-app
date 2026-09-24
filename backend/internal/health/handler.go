// Package health reports whether the api and its dependencies are usable.
package health

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// pingTimeout bounds the database check so a hung database cannot hold the
// health endpoint open and stall the load balancer's own timeout.
const pingTimeout = 2 * time.Second

// Status values reported in the response body.
const (
	StatusOK       = "ok"
	StatusDegraded = "degraded"
	StatusError    = "error"
)

// Pinger is the slice of the database pool this feature actually needs.
// Declaring it here rather than importing pgxpool keeps the handler unit
// testable without a database; *pgxpool.Pool satisfies it as is.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Response is the body returned by GET /healthz.
type Response struct {
	Status string `json:"status"`
	DB     string `json:"db"`
}

// Handler serves the health endpoints.
type Handler struct {
	db Pinger
}

// NewHandler builds a health handler backed by db.
func NewHandler(db Pinger) *Handler {
	return &Handler{db: db}
}

// Register wires the health routes onto the router.
func (h *Handler) Register(router gin.IRouter) {
	router.GET("/healthz", h.Healthz)
}

// Healthz reports process and database health. An unreachable database yields
// 503 rather than 200 so that a load balancer takes this instance out of
// rotation instead of sending it traffic it cannot serve.
func (h *Handler) Healthz(c *gin.Context) {
	// Gin rule 1: only the request's context.Context crosses this boundary,
	// never *gin.Context.
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
