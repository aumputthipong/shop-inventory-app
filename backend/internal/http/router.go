package httpx

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Route interface {
	Register(router gin.IRouter)
}

type RouterConfig struct {
	Logger  *slog.Logger
	GinMode string
	Routes  []Route
}

func NewRouter(cfg RouterConfig) http.Handler {
	gin.SetMode(cfg.GinMode)

	engine := gin.New()

	if err := engine.SetTrustedProxies(nil); err != nil {
		cfg.Logger.Error("set trusted proxies", slog.String("error", err.Error()))
	}

	engine.Use(RequestID(), RequestLogger(cfg.Logger), Recovery(cfg.Logger))

	engine.NoRoute(func(c *gin.Context) {
		RespondError(c, http.StatusNotFound, CodeNotFound, "route not found")
	})
	engine.NoMethod(func(c *gin.Context) {
		RespondError(c, http.StatusMethodNotAllowed, CodeNotFound, "method not allowed for this route")
	})

	for _, route := range cfg.Routes {
		route.Register(engine)
	}

	return engine
}
