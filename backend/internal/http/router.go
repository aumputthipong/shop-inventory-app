// Package httpx owns the gin engine, the shared middleware and the JSON error
// helpers.
//
// This package and feature-level handler.go files are the only places allowed
// to import gin; see the Gin rules in CLAUDE.md, which golangci-lint enforces
// through depguard. NewRouter deliberately returns net/http's Handler so that
// *gin.Engine does not leak into cmd/api.
package httpx

import (
	"log/slog"
	"net/http"
	"reflect"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// Route registers one feature's endpoints on the engine. Feature packages
// implement this so that the router does not need to know their internals.
type Route interface {
	Register(router gin.IRouter)
}

// RouterConfig carries everything NewRouter needs to build the handler.
type RouterConfig struct {
	Logger    *slog.Logger
	GinMode   string
	Routes    []Route
	Protected []Route
	Sessions  SessionResolver
	StaticDir string
}

// NewRouter builds the application http handler.
func NewRouter(cfg RouterConfig) http.Handler {
	gin.SetMode(cfg.GinMode)

	engine := gin.New()

	// Trusted proxies are set explicitly. nil means gin trusts no proxy
	// headers, which is correct until the api runs behind a known proxy.
	if err := engine.SetTrustedProxies(nil); err != nil {
		cfg.Logger.Error("set trusted proxies", slog.String("error", err.Error()))
	}

	engine.Use(RequestID(), RequestLogger(cfg.Logger), Recovery(cfg.Logger))

	if cfg.StaticDir != "" {
		engine.NoRoute(spaHandler(cfg.StaticDir))
	} else {
		engine.NoRoute(func(c *gin.Context) {
			RespondError(c, http.StatusNotFound, CodeNotFound, "route not found")
		})
	}
	engine.NoMethod(func(c *gin.Context) {
		RespondError(c, http.StatusMethodNotAllowed, CodeNotFound, "method not allowed for this route")
	})

	useJSONFieldNames.Do(registerJSONFieldNames)

	for _, route := range cfg.Routes {
		route.Register(engine)
	}

	if len(cfg.Protected) > 0 {
		protected := engine.Group("", RequireAuth(cfg.Sessions))
		for _, route := range cfg.Protected {
			route.Register(protected)
		}
	}

	return engine
}

var useJSONFieldNames sync.Once

func registerJSONFieldNames() {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}
	v.RegisterTagNameFunc(func(field reflect.StructField) string {
		name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
		if name == "" || name == "-" {
			return field.Name
		}
		return name
	})
}
