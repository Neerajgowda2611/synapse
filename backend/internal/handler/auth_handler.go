package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
)

// AuthHandler handles auth-related endpoints.
type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

type meResponse struct {
	UserID        string  `json:"user_id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	UserType      string  `json:"user_type"`
	Role          string  `json:"role"`
	InstitutionID *string `json:"institution_id,omitempty"`
}

// Me returns the authenticated caller's identity and role.
// Frontend uses this on app load to route users to the correct dashboard.
func (h *AuthHandler) Me(c *gin.Context) {
	ac := auth.FromContext(c.Request.Context())
	if ac == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	resp := meResponse{
		UserID:   ac.UserID.String(),
		Email:    ac.Email,
		Name:     ac.Name,
		UserType: string(ac.UserType),
		Role:     ac.Role,
	}

	if ac.InstitutionID != nil {
		s := ac.InstitutionID.String()
		resp.InstitutionID = &s
	}

	c.JSON(http.StatusOK, resp)
}
