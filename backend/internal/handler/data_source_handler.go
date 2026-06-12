package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/profiler/backend/internal/service"
)

type DataSourceHandler struct {
	service *service.DataSourceService
}

func NewDataSourceHandler(service *service.DataSourceService) *DataSourceHandler {
	return &DataSourceHandler{service: service}
}

type createDataSourceRequest struct {
	InstitutionID         uuid.UUID `json:"institution_id" binding:"required"`
	ConnectorDefinitionID uuid.UUID `json:"connector_definition_id" binding:"required"`
	Name                  string    `json:"name" binding:"required"`
	Status                string    `json:"status"`
}

func (h *DataSourceHandler) Create(c *gin.Context) {
	var req createDataSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dataSource, err := h.service.Create(c.Request.Context(), service.CreateDataSourceInput{
		InstitutionID:         req.InstitutionID,
		ConnectorDefinitionID: req.ConnectorDefinitionID,
		Name:                  req.Name,
		Status:                req.Status,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidDataSource):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrInstitutionNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrConnectorDefinitionNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create data source"})
		}
		return
	}

	c.JSON(http.StatusCreated, dataSource)
}

func (h *DataSourceHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var institutionID *uuid.UUID
	if value := c.Query("institution_id"); value != "" {
		id, err := uuid.Parse(value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid institution_id"})
			return
		}
		institutionID = &id
	}

	var connectorDefinitionID *uuid.UUID
	if value := c.Query("connector_definition_id"); value != "" {
		id, err := uuid.Parse(value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid connector_definition_id"})
			return
		}
		connectorDefinitionID = &id
	}

	dataSources, err := h.service.List(c.Request.Context(), institutionID, connectorDefinitionID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list data sources"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": dataSources})
}

func (h *DataSourceHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid data source id"})
		return
	}

	dataSource, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrDataSourceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get data source"})
		return
	}

	c.JSON(http.StatusOK, dataSource)
}
