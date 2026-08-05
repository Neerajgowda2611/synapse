package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/logs"
)

// RequireAuth validates the Bearer JWT and loads AuthContext onto the request context.
// Returns 401 if the token is missing, invalid, or the user is not provisioned.
func RequireAuth(validator *auth.Validator, resolver *auth.Resolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken := extractBearer(c.GetHeader("Authorization"))
		if rawToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization token required"})
			return
		}

		claims, err := validator.Validate(c.Request.Context(), rawToken)
		if err != nil {
			logs.Info("jwt validation failed", "error", err, "path", c.Request.URL.Path)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		ac, err := resolver.Resolve(c.Request.Context(), claims)
		if err != nil {
			if errors.Is(err, auth.ErrUserNotProvisioned) {
				logs.Info("user not provisioned", "sub", claims.Sub, "email", claims.Email)
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":   "user_not_provisioned",
					"message": "Your account exists in the identity provider but has not been added to Profiler. Contact your administrator.",
				})
				return
			}
			logs.Error("resolver error", "error", err, "sub", claims.Sub)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "authentication failed"})
			return
		}

		ctx := auth.ToContext(c.Request.Context(), ac)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func extractBearer(header string) string {
	if !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(header, "Bearer ")
}
