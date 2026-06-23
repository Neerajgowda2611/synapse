package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	connectorwebhook "github.com/profiler/backend/internal/connector/webhook"
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

	// Cap body at 1 MB to prevent oversized payloads
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20)

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body (max 1 MB)"})
		return
	}
	if len(body) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body is required"})
		return
	}

	var envelope connectorwebhook.ObservationEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body must be valid JSON"})
		return
	}

	result, err := h.service.IngestObservationEnvelope(c.Request.Context(), token, &envelope)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrWebhookNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrRawStorageConsentRequired):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case connectorwebhook.IsEnvelopeValidationError(err):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ingest observation"})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"id":                result.Observation.ID,
		"source_id":         result.Observation.SourceID,
		"source_event_type": result.Observation.SourceEventType,
		"received_at":       result.Observation.ReceivedAt,
		"duplicate":         result.Duplicate,
	})
}
