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

type storeCredentialsRequest struct {
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port"`
	Database string `json:"database" binding:"required"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	SSLMode  string `json:"sslmode"`
	Schema   string `json:"schema"`
}

type saveEntitiesRequest struct {
	Entities []entitySelectionRequest `json:"entities"`
}

type entitySelectionRequest struct {
	SourceName   string  `json:"source_name" binding:"required"`
	TargetDomain *string `json:"target_domain"`
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
		case errors.Is(err, service.ErrDataSourceAccessDenied):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
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
		if errors.Is(err, service.ErrDataSourceAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
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

func (h *DataSourceHandler) ListConnectors(c *gin.Context) {
	connectors, err := h.service.ListConnectorDefinitions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list connectors"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": connectors})
}

func (h *DataSourceHandler) GetCredentials(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	creds, err := h.service.GetCredentials(c.Request.Context(), id)
	if err != nil {
		respondDataSourceError(c, err, "failed to get credentials")
		return
	}

	c.JSON(http.StatusOK, creds)
}

func (h *DataSourceHandler) StoreCredentials(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	var req storeCredentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.StoreCredentials(c.Request.Context(), id, service.StoreCredentialsInput{
		Host:     req.Host,
		Port:     req.Port,
		Database: req.Database,
		Username: req.Username,
		Password: req.Password,
		SSLMode:  req.SSLMode,
		Schema:   req.Schema,
	})
	if err != nil {
		respondDataSourceError(c, err, "failed to store credentials")
		return
	}

	c.JSON(http.StatusOK, gin.H{"configured": true})
}

func (h *DataSourceHandler) TestConnection(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	if err := h.service.TestConnection(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrDataSourceNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrDataSourceAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrConnectorCredentialsNotFound) || errors.Is(err, service.ErrInvalidConnectorCredentials) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *DataSourceHandler) DiscoverSchema(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	snapshot, err := h.service.DiscoverSchema(c.Request.Context(), id)
	if err != nil {
		respondDataSourceError(c, err, "failed to discover schema")
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *DataSourceHandler) GetSchema(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	snapshot, err := h.service.GetSchema(c.Request.Context(), id)
	if err != nil {
		respondDataSourceError(c, err, "failed to get schema")
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *DataSourceHandler) ListEntities(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	entities, err := h.service.ListEntities(c.Request.Context(), id)
	if err != nil {
		respondDataSourceError(c, err, "failed to list entities")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entities})
}

func (h *DataSourceHandler) SaveEntities(c *gin.Context) {
	id, ok := parseDataSourceID(c)
	if !ok {
		return
	}

	var req saveEntitiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	selections := make([]service.EntitySelectionInput, 0, len(req.Entities))
	for _, entity := range req.Entities {
		selections = append(selections, service.EntitySelectionInput{
			SourceName:   entity.SourceName,
			TargetDomain: entity.TargetDomain,
		})
	}

	entities, err := h.service.SaveEntities(c.Request.Context(), id, selections)
	if err != nil {
		respondDataSourceError(c, err, "failed to save entities")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entities})
}

func parseDataSourceID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid data source id"})
		return uuid.Nil, false
	}
	return id, true
}

func respondDataSourceError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, service.ErrDataSourceNotFound), errors.Is(err, service.ErrSchemaSnapshotNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrDataSourceAccessDenied):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrInvalidDataSource), errors.Is(err, service.ErrInvalidConnectorCredentials), errors.Is(err, service.ErrConnectorCredentialsNotFound):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": fallback})
	}
}
