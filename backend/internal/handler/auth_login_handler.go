package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/logs"
)

type AuthLoginHandler struct {
	loginClient *auth.LoginClient
	devMode     bool
}

func NewAuthLoginHandler(loginClient *auth.LoginClient, devMode bool) *AuthLoginHandler {
	return &AuthLoginHandler{loginClient: loginClient, devMode: devMode}
}

type loginRequest struct {
	Login    string `json:"login"`
	Email    string `json:"email"` // legacy alias; Zitadel Session API expects preferred login name
	Password string `json:"password" binding:"required"`
}

type tokenExchangeRequest struct {
	Code         string `json:"code" binding:"required"`
	State        string `json:"state"`
	CodeVerifier string `json:"code_verifier" binding:"required"`
}

// Login authenticates with Zitadel username/password via Session API (no hosted UI redirect).
// Returns code+state for the frontend /auth/callback flow.
func (h *AuthLoginHandler) Login(c *gin.Context) {
	if !h.loginClient.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "password login not configured — set ZITADEL_SERVICE_USER_TOKEN on the backend",
		})
		return
	}

	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loginName := strings.TrimSpace(req.Login)
	if loginName == "" {
		loginName = strings.TrimSpace(req.Email)
	}
	if loginName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "login is required"})
		return
	}

	exchange, err := h.loginClient.LoginWithPassword(loginName, req.Password)
	if err != nil {
		logs.Info("login failed", "login", loginName, "error", err.Error())
		msg := "invalid credentials"
		if h.devMode {
			msg = err.Error()
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
		return
	}

	c.JSON(http.StatusOK, exchange)
}

// TokenExchange exchanges an authorization code for access/refresh tokens.
func (h *AuthLoginHandler) TokenExchange(c *gin.Context) {
	var req tokenExchangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.loginClient.ExchangeCode(req.Code, req.CodeVerifier)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token exchange failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tokens})
}

// ErrLoginNotConfigured is returned when service token is missing.
var ErrLoginNotConfigured = errors.New("login not configured")
