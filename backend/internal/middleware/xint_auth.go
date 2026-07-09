package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/xint"
)

const (
	xintSourceHeader = "X-Xint-Source"
	xintTokenHeader  = "X-Xint-Token"
	xintSourceKey    = "xint_source"
)

func RequireXint(cfg xint.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.Enabled {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "xint is not enabled",
			})
			return
		}

		token := strings.TrimSpace(c.GetHeader(xintTokenHeader))
		if token == "" || token != cfg.ServiceToken {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid xint token",
			})
			return
		}

		source := strings.ToLower(strings.TrimSpace(c.GetHeader(xintSourceHeader)))
		if source == "" || !cfg.IsAllowedSource(source) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid xint source",
			})
			return
		}

		c.Set(xintSourceKey, source)
		c.Next()
	}
}

func XintSource(c *gin.Context) string {
	source, _ := c.Get(xintSourceKey)
	s, _ := source.(string)
	return s
}
