package httpx

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// spaHandler serves the built frontend, falling back to index.html so client routes survive a reload.
func spaHandler(dir string) gin.HandlerFunc {
	files := http.Dir(dir)
	index := filepath.Join(dir, "index.html")

	return func(c *gin.Context) {
		p := c.Request.URL.Path
		if (c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead) ||
			strings.HasPrefix(p, "/api/") || p == "/healthz" {
			RespondError(c, http.StatusNotFound, CodeNotFound, "route not found")
			return
		}

		clean := path.Clean("/" + p)
		if f, err := files.Open(clean); err == nil {
			info, statErr := f.Stat()
			_ = f.Close()
			if statErr == nil && !info.IsDir() {
				if strings.HasPrefix(clean, "/assets/") {
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				}
				c.FileFromFS(clean, files)
				return
			}
		}

		if _, err := os.Stat(index); err != nil {
			RespondError(c, http.StatusNotFound, CodeNotFound, "route not found")
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.File(index)
	}
}
