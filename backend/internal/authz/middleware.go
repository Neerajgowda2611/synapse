package authz

import (
	"net/http"

	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/logs"
)

// Require returns a Gin middleware that enforces (role, domain, object, action) via Casbin.
// Must be placed after RequireAuth so AuthContext (including role from user_roles) is available.
func Require(enforcer *casbin.Enforcer, obj, act string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ac := auth.FromContext(c.Request.Context())
		if ac == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		role := ac.Role
		dom := ac.Domain()

		allowed, err := enforcer.Enforce(role, dom, obj, act)
		if err != nil {
			logs.Error("casbin enforce error", "error", err, "role", role, "dom", dom, "obj", obj, "act", act)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "authorization check failed"})
			return
		}

		if !allowed {
			logs.Info("access denied", "role", role, "dom", dom, "obj", obj, "act", act, "user_id", ac.UserID)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		c.Next()
	}
}
