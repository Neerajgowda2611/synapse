package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/middleware"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/internal/xint"
)

type XintHandler struct {
	resolver  *xint.Resolver
	jobIngest *service.JobIngestService
}

func NewXintHandler(resolver *xint.Resolver, jobIngest *service.JobIngestService) *XintHandler {
	return &XintHandler{resolver: resolver, jobIngest: jobIngest}
}

func (h *XintHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"app":     "profiler",
		"source":  middleware.XintSource(c),
		"version": "v1",
	})
}

func (h *XintHandler) ResolveUser(c *gin.Context) {
	authxSubject := strings.TrimSpace(c.Query("authx_subject"))
	email := strings.TrimSpace(c.Query("email"))

	var (
		resolved *xint.ResolvedUser
		err      error
	)
	switch {
	case authxSubject != "":
		resolved, err = h.resolver.ResolveLocalUserByAuthxSubject(c.Request.Context(), authxSubject)
	case email != "":
		resolved, err = h.resolver.ResolveLocalUserByEmail(c.Request.Context(), email)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "authx_subject or email is required"})
		return
	}

	if err != nil {
		switch {
		case errors.Is(err, xint.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		case errors.Is(err, xint.ErrIdentifierMissing):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve user"})
		}
		return
	}

	resp := gin.H{
		"user_id": resolved.UserID,
		"email":   resolved.Email,
		"name":    resolved.Name,
	}
	if resolved.AuthxSubject != nil && strings.TrimSpace(*resolved.AuthxSubject) != "" {
		resp["authx_subject"] = *resolved.AuthxSubject
	}
	if resolved.InstitutionID != nil {
		resp["institution_id"] = *resolved.InstitutionID
	}
	c.JSON(http.StatusOK, resp)
}

func (h *XintHandler) UpsertJob(c *gin.Context) {
	var req service.IngestJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	result, err := h.jobIngest.UpsertJob(c.Request.Context(), middleware.XintSource(c), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidIngestPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrUnknownTrait):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrInstitutionNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "institution not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upsert job"})
		}
		return
	}

	status := http.StatusOK
	if result.Created {
		status = http.StatusCreated
	}
	c.JSON(status, result)
}

func (h *XintHandler) LookupJob(c *gin.Context) {
	xintSourceRef := strings.TrimSpace(c.Query("xint_source_ref"))
	if xintSourceRef == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "xint_source_ref is required"})
		return
	}

	job, err := h.jobIngest.LookupJob(c.Request.Context(), middleware.XintSource(c), xintSourceRef)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrJobNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		case errors.Is(err, service.ErrInvalidIngestPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lookup job"})
		}
		return
	}

	resp := gin.H{
		"job_id":           job.ID,
		"title":            job.Title,
		"reward_system_id": job.RewardSystemID,
		"status":           job.Status,
		"source_app":       job.SourceApp,
		"xint_source_ref":  job.XintSourceRef,
	}
	if job.CompanyName != nil {
		resp["company_name"] = *job.CompanyName
	}
	if job.Subtitle != nil {
		resp["subtitle"] = *job.Subtitle
	}
	if job.ExternalURL != nil {
		resp["external_url"] = *job.ExternalURL
	}
	if job.InstitutionID != nil {
		resp["institution_id"] = *job.InstitutionID
	}
	c.JSON(http.StatusOK, resp)
}
