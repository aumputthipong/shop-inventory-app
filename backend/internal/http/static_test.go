package httpx_test

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
)

func TestServesTheFrontend(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html>app</html>"), 0o600))
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "assets"), 0o750))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "assets", "app-1.js"), []byte("js"), 0o600))

	router := httpx.NewRouter(httpx.RouterConfig{
		Logger:    slog.New(slog.DiscardHandler),
		GinMode:   config.GinModeTest,
		StaticDir: dir,
	})

	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantBody   string
	}{
		{"asset file", http.MethodGet, "/assets/app-1.js", http.StatusOK, "js"},
		{"client route falls back to index", http.MethodGet, "/orders/12", http.StatusOK, "<html>app</html>"},
		{"unknown api route stays json 404", http.MethodGet, "/api/nope", http.StatusNotFound, "not_found"},
		{"traversal is refused", http.MethodGet, "/../../etc/passwd", http.StatusBadRequest, "invalid URL path"},
		{"writes never hit the frontend", http.MethodPost, "/orders", http.StatusNotFound, "not_found"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequestWithContext(t.Context(), tt.method, tt.path, nil)
			router.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
			assert.Contains(t, rec.Body.String(), tt.wantBody)
		})
	}
}
