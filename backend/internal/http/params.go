package httpx

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	defaultPageLimit = 50
	maxPageLimit     = 200
)

type Page struct {
	Limit  int32
	Offset int32
}

func PageFrom(c *gin.Context) Page {
	limit := queryInt(c, "limit", defaultPageLimit)
	if limit < 1 || limit > maxPageLimit {
		limit = defaultPageLimit
	}
	offset := max(queryInt(c, "offset", 0), 0)
	return Page{Limit: int32(limit), Offset: int32(offset)}
}

// PathID answers 404 itself when the id segment is not a positive integer.
func PathID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id < 1 {
		RespondError(c, http.StatusNotFound, CodeNotFound, "not found")
		return 0, false
	}
	return id, true
}

func QueryString(c *gin.Context, name string) *string {
	v := c.Query(name)
	if v == "" {
		return nil
	}
	return &v
}

func queryInt(c *gin.Context, name string, fallback int) int {
	v, err := strconv.Atoi(c.Query(name))
	if err != nil {
		return fallback
	}
	return v
}
