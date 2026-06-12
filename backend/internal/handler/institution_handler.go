package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/profiler/backend/internal/service"
)

type InstitutionHandler struct {
	service *service.InstitutionService
}

func NewInstitutionHandler(service *service.InstitutionService) *InstitutionHandler {
	return &InstitutionHandler{service: service}
}

type createInstitutionRequest struct {
	Name   string  `json:"name" binding:"required"`
	Type   *string `json:"type"`
	Status string  `json:"status"`
}

func (h *InstitutionHandler) Create(c *gin.Context) {
	var req createInstitutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	institution, err := h.service.Create(c.Request.Context(), service.CreateInstitutionInput{
		Name:   req.Name,
		Type:   req.Type,
		Status: req.Status,
	})
	if err != nil {
		if errors.Is(err, service.ErrInvalidInstitution) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create institution"})
		return
	}

	c.JSON(http.StatusCreated, institution)
}

func (h *InstitutionHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	status := c.Query("status")

	institutions, err := h.service.List(c.Request.Context(), status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list institutions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": institutions})
}

func (h *InstitutionHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid institution id"})
		return
	}

	institution, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrInstitutionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get institution"})
		return
	}

	c.JSON(http.StatusOK, institution)
}
