package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/casbin/casbin/v3"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/authz"
	"github.com/profiler/backend/internal/service"
	"gorm.io/gorm"
)

type ProfileHandler struct {
	metricService *service.MetricService
	enforcer      *casbin.Enforcer
}

func NewProfileHandler(metricService *service.MetricService, enforcer *casbin.Enforcer) *ProfileHandler {
	return &ProfileHandler{metricService: metricService, enforcer: enforcer}
}

func (h *ProfileHandler) ListJobs(c *gin.Context) {
	learnerInstitutionID := learnerInstitutionFilter(c)
	jobs, err := h.metricService.ListJobsWithCriteria(c.Request.Context(), learnerInstitutionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list jobs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": jobs})
}

func (h *ProfileHandler) GetJob(c *gin.Context) {
	jobID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	job, err := h.metricService.GetJobWithCriteria(c.Request.Context(), jobID, learnerInstitutionFilter(c))
	if err != nil {
		if errors.Is(err, service.ErrJobNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get job"})
		return
	}
	c.JSON(http.StatusOK, job)
}

func (h *ProfileHandler) ListUserTraits(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	traits, err := h.metricService.ListUserTraits(c.Request.Context(), userID, asOf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list traits"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": traits, "as_of": asOf})
}

func (h *ProfileHandler) ListUserStreamActivity(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	activity, err := h.metricService.ListUserStreamActivity(c.Request.Context(), userID, asOf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stream activity"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": activity, "as_of": asOf})
}

func (h *ProfileHandler) GetUserJobFit(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	fit, err := h.metricService.GetUserJobFit(c.Request.Context(), userID, jobID, asOf, learnerInstitutionFilter(c))
	if err != nil {
		if errors.Is(err, service.ErrJobNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute job fit"})
		return
	}
	c.JSON(http.StatusOK, fit)
}

func (h *ProfileHandler) ListUserJobFits(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	fits, err := h.metricService.ListUserJobFits(c.Request.Context(), userID, asOf, learnerInstitutionFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute job fits"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": fits, "as_of": asOf})
}

func (h *ProfileHandler) GetTraitEvidence(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	trait := c.Param("trait")
	if trait == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "trait is required"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	evidence, err := h.metricService.GetTraitEvidence(c.Request.Context(), userID, trait, asOf)
	if err != nil {
		if errors.Is(err, service.ErrTraitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "trait estimate not found — refresh traits first"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get trait evidence"})
		return
	}
	c.JSON(http.StatusOK, evidence)
}

func (h *ProfileHandler) RefreshUserTraits(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}
	if !h.canAccessUserProfile(c, userID) {
		return
	}
	asOf := parseAsOf(c)
	run, estimates, err := h.metricService.EnsureUserTraits(c.Request.Context(), userID, asOf, "api:refresh-user-traits")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh traits"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"metric_run_id": run.ID,
		"as_of":         asOf,
		"n_traits":      len(estimates),
	})
}

func (h *ProfileHandler) canAccessUserProfile(c *gin.Context, targetUserID uuid.UUID) bool {
	ac := auth.FromContext(c.Request.Context())
	if ac == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return false
	}
	if ac.UserID == targetUserID {
		allowed, err := h.enforcer.Enforce(ac.UserID.String(), ac.Domain(), authz.ResourceProfile, authz.ActionRead)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "authorization check failed"})
			return false
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return false
		}
		return true
	}
	allowed, err := h.enforcer.Enforce(ac.UserID.String(), ac.Domain(), authz.ResourceUsers, authz.ActionRead)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "authorization check failed"})
		return false
	}
	if !allowed {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return false
	}
	return true
}

func parseAsOf(c *gin.Context) time.Time {
	if raw := c.Query("as_of"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			return t.UTC()
		}
	}
	return time.Now().UTC()
}

func learnerInstitutionFilter(c *gin.Context) *uuid.UUID {
	ac := auth.FromContext(c.Request.Context())
	if ac == nil || ac.UserType != auth.UserTypeLearner {
		return nil
	}
	return ac.InstitutionID
}
