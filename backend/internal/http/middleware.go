package httpx

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const RequestIDHeader = "X-Request-ID"

type requestIDKey struct{}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(RequestIDHeader)
		if id == "" {
			id = uuid.NewString()
		}

		c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), requestIDKey{}, id))
		c.Header(RequestIDHeader, id)

		c.Next()
	}
}

func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

func RequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery

		c.Next()

		status := c.Writer.Status()
		attrs := []slog.Attr{
			slog.String("request_id", RequestIDFrom(c.Request.Context())),
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.Int("status", status),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
			slog.String("client_ip", c.ClientIP()),
		}
		if rawQuery != "" {
			attrs = append(attrs, slog.String("query", rawQuery))
		}
		if len(c.Errors) > 0 {
			attrs = append(attrs, slog.String("errors", c.Errors.String()))
		}

		logger.LogAttrs(c.Request.Context(), levelForStatus(status), "http request", attrs...)
	}
}

func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			recovered := recover()
			if recovered == nil {
				return
			}

			if isBrokenPipe(recovered) {
				logger.LogAttrs(c.Request.Context(), slog.LevelWarn, "client connection closed",
					slog.String("request_id", RequestIDFrom(c.Request.Context())),
					slog.String("path", c.Request.URL.Path),
					slog.Any("error", recovered),
				)
				c.Abort()
				return
			}

			logger.LogAttrs(c.Request.Context(), slog.LevelError, "panic recovered",
				slog.String("request_id", RequestIDFrom(c.Request.Context())),
				slog.String("method", c.Request.Method),
				slog.String("path", c.Request.URL.Path),
				slog.Any("panic", recovered),
				slog.String("stack", string(debug.Stack())),
			)

			RespondError(c, http.StatusInternalServerError, CodeInternal, "internal server error")
		}()

		c.Next()
	}
}

func levelForStatus(status int) slog.Level {
	switch {
	case status >= http.StatusInternalServerError:
		return slog.LevelError
	case status >= http.StatusBadRequest:
		return slog.LevelWarn
	default:
		return slog.LevelInfo
	}
}

func isBrokenPipe(recovered any) bool {
	err, ok := recovered.(error)
	if !ok {
		return false
	}

	var netErr *net.OpError
	if !errors.As(err, &netErr) {
		return false
	}

	var syscallErr *os.SyscallError
	if !errors.As(netErr, &syscallErr) {
		return false
	}

	msg := strings.ToLower(syscallErr.Error())
	return strings.Contains(msg, "broken pipe") ||
		strings.Contains(msg, "connection reset by peer") ||
		strings.Contains(msg, "an established connection was aborted")
}
