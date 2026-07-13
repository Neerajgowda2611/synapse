package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/logs"
)

// AuthxHandler exposes the AuthX-bridge endpoints:
//   POST /auth/authx/session-token   — exchange an AuthX id_token for a profiler access token.
//   POST /auth/authx/refresh-session — exchange an AuthX refresh_token for a fresh profiler access token.
//   POST /auth/authx/logout          — revoke an AuthX refresh_token (best-effort).
type AuthxHandler struct {
	svc     *auth.AuthxSessionService
	enabled bool
}

func NewAuthxHandler(svc *auth.AuthxSessionService, enabled bool) *AuthxHandler {
	return &AuthxHandler{svc: svc, enabled: enabled}
}

type authxSessionTokenRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

func (h *AuthxHandler) SessionToken(c *gin.Context) {
	if !h.enabled {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "authx is not enabled"})
		return
	}

	var req authxSessionTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.ExchangeSessionToken(c.Request.Context(), req.IDToken)
	if err != nil {
		status, code := statusForAuthxError(err)
		logs.Info("authx session-token failed", "error", err.Error(), "code", code)
		c.JSON(status, gin.H{"error": code})
		return
	}

	c.JSON(http.StatusOK, resp)
}

type authxRefreshSessionRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthxHandler) RefreshSession(c *gin.Context) {
	if !h.enabled {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "authx is not enabled"})
		return
	}

	var req authxRefreshSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.RefreshSession(c.Request.Context(), req.RefreshToken)
	if err != nil {
		status, code := statusForAuthxError(err)
		logs.Info("authx refresh-session failed", "error", err.Error(), "code", code)
		c.JSON(status, gin.H{"error": code})
		return
	}

	c.JSON(http.StatusOK, resp)
}

type authxLogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Logout revokes the AuthX offline_access refresh token so an explicit logout
// cannot be silently re-minted from a surviving refresh token.
func (h *AuthxHandler) Logout(c *gin.Context) {
	if !h.enabled {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "authx is not enabled"})
		return
	}

	var req authxLogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.RevokeSession(c.Request.Context(), req.RefreshToken); err != nil {
		// Best-effort: log but do not block the client's logout flow.
		logs.Info("authx logout revoke failed", "error", err.Error())
	}

	c.JSON(http.StatusOK, gin.H{"revoked": true})
}

func statusForAuthxError(err error) (int, string) {
	switch {
	case errors.Is(err, auth.ErrUserNotProvisioned):
		return http.StatusUnauthorized, "user_not_provisioned"
	case errors.Is(err, auth.ErrAuthxSubMismatch):
		return http.StatusUnauthorized, "authx_sub_mismatch"
	default:
		return http.StatusUnauthorized, "authentication_failed"
	}
}
