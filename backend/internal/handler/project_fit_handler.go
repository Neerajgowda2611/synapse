package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/internal/xint"
	"gorm.io/gorm"
)

type ProjectFitHandler struct {
	service *service.ProjectFitService
}

func NewProjectFitHandler(projectFitService *service.ProjectFitService) *ProjectFitHandler {
	return &ProjectFitHandler{service: projectFitService}
}

func (h *ProjectFitHandler) Get(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project-fit token is required"})
		return
	}

	result, err := h.service.GetBySignedToken(c.Request.Context(), token)
	if err != nil {
		switch {
		case errors.Is(err, xint.ErrExpiredProfileLink):
			c.JSON(http.StatusGone, gin.H{"error": "project-fit link has expired"})
		case errors.Is(err, xint.ErrInvalidProfileLink):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project-fit link"})
		case errors.Is(err, service.ErrProjectFitTargetMismatch):
			c.JSON(http.StatusForbidden, gin.H{"error": "project-fit link does not match this target"})
		case errors.Is(err, service.ErrJobNotFound), errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "project or learner not found"})
		case strings.Contains(err.Error(), "no construct estimates generated"):
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "learner has no usable scoring data"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load project fit"})
		}
		return
	}

	c.JSON(http.StatusOK, result)
}
