package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/service"
)

type InstitutionUserHandler struct {
	service *service.InstitutionUserService
}

func NewInstitutionUserHandler(svc *service.InstitutionUserService) *InstitutionUserHandler {
	return &InstitutionUserHandler{service: svc}
}

type createInstitutionUserRequest struct {
	Name  string `json:"name"  binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role"  binding:"required"`
}

// Create adds a user to an institution.
// Institution admins may only add users to their own institution.
func (h *InstitutionUserHandler) Create(c *gin.Context) {
	institutionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid institution id"})
		return
	}

	ac := auth.FromContext(c.Request.Context())
	if ac != nil && ac.UserType == auth.UserTypeInstitution {
		if ac.InstitutionID == nil || *ac.InstitutionID != institutionID {
			c.JSON(http.StatusForbidden, gin.H{"error": "cannot manage users of another institution"})
			return
		}
	}

	var req createInstitutionUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Create(c.Request.Context(), service.CreateInstitutionUserInput{
		InstitutionID: institutionID,
		Name:          req.Name,
		Email:         req.Email,
		Role:          req.Role,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidInstitutionUser):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrInstitutionUserEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		}
		return
	}

	c.JSON(http.StatusCreated, user)
}

// List returns all active users for an institution.
func (h *InstitutionUserHandler) List(c *gin.Context) {
	institutionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid institution id"})
		return
	}

	ac := auth.FromContext(c.Request.Context())
	if ac != nil && ac.UserType == auth.UserTypeInstitution {
		if ac.InstitutionID == nil || *ac.InstitutionID != institutionID {
			c.JSON(http.StatusForbidden, gin.H{"error": "cannot list users of another institution"})
			return
		}
	}

	users, err := h.service.ListByInstitution(c.Request.Context(), institutionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
