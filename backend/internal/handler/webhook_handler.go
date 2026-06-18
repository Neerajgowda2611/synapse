package handler

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/service"
)

type WebhookHandler struct {
	service *service.DataSourceService
}

func NewWebhookHandler(service *service.DataSourceService) *WebhookHandler {
	return &WebhookHandler{service: service}
}

func (h *WebhookHandler) Ingest(c *gin.Context) {
	token := c.Param("token")
	entityType := c.Param("entity_type")

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}
	if len(body) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body is required"})
		return
	}

	record, err := h.service.IngestWebhook(c.Request.Context(), token, entityType, body)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrWebhookNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrInvalidWebhookPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ingest webhook payload"})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"id":          record.ID,
		"entity_type": record.EntityType,
		"external_id": record.ExternalID,
	})
}
