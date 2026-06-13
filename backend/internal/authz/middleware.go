package authz

import (
	"net/http"

	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/logs"
)

// Require returns a Gin middleware that enforces (sub, dom, obj, act) via Casbin.
// Must be placed after the RequireAuth middleware so AuthContext is available.
func Require(enforcer *casbin.Enforcer, obj, act string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ac := auth.FromContext(c.Request.Context())
		if ac == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		sub := ac.UserID.String()
		dom := ac.Domain()

		allowed, err := enforcer.Enforce(sub, dom, obj, act)
		if err != nil {
			logs.Error("casbin enforce error", "error", err, "sub", sub, "dom", dom, "obj", obj, "act", act)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "authorization check failed"})
			return
		}

		if !allowed {
			logs.Info("access denied", "sub", sub, "dom", dom, "obj", obj, "act", act, "role", ac.Role)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		c.Next()
	}
}
