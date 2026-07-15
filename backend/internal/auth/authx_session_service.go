package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/profiler/backend/internal/repository"
)

// SessionTokenResponse is what the frontend receives from the session-token / refresh-session endpoints.
type SessionTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
}

// AuthxSessionService bridges AuthX id_tokens to profiler-minted access tokens.
type AuthxSessionService struct {
	userRepo   *repository.UserRepository
	cfg        AuthxConfig
	httpClient *http.Client
}

func NewAuthxSessionService(userRepo *repository.UserRepository, cfg AuthxConfig) *AuthxSessionService {
	return &AuthxSessionService{
		userRepo:   userRepo,
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// ExchangeSessionToken validates an AuthX id_token, ensures the profiler user exists
// (pre-provisioned), and mints a profiler access token.
func (s *AuthxSessionService) ExchangeSessionToken(ctx context.Context, idToken string) (*SessionTokenResponse, error) {
	if !s.cfg.Enabled {
		return nil, errors.New("authx is not enabled")
	}

	claims, err := ParseAuthxIDToken(ctx, idToken, s.cfg)
	if err != nil {
		return nil, err
	}

	user, roles, err := EnsureAuthxUser(ctx, s.userRepo, claims)
	if err != nil {
		return nil, err
	}

	primary := pickPrimaryRole(roles)
	accessToken, expiresIn, err := MintProfilerAccessToken(user, primary, s.cfg)
	if err != nil {
		return nil, err
	}

	return &SessionTokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   expiresIn,
		TokenType:   "Bearer",
	}, nil
}

// RefreshSession takes an AuthX refresh_token, obtains a fresh id_token from AuthX,
// and mints a new profiler access token.
func (s *AuthxSessionService) RefreshSession(ctx context.Context, refreshToken string) (*SessionTokenResponse, error) {
	if !s.cfg.Enabled {
		return nil, errors.New("authx is not enabled")
	}
	if strings.TrimSpace(refreshToken) == "" {
		return nil, errors.New("refresh_token is required")
	}

	discovery, err := s.fetchOIDCDiscovery(ctx)
	if err != nil {
		return nil, err
	}

	tokens, err := s.refreshAuthxTokens(ctx, discovery.TokenEndpoint, refreshToken)
	if err != nil {
		return nil, err
	}

	var claims *AuthxIDTokenClaims
	switch {
	case tokens.IDToken != "":
		claims, err = ParseAuthxIDToken(ctx, tokens.IDToken, s.cfg)
	default:
		userinfoURL := discovery.UserinfoEndpoint
		if userinfoURL == "" {
			userinfoURL = strings.TrimRight(s.cfg.AuthIdpUrl, "/") + "/api/auth/oauth2/userinfo"
		}
		claims, err = s.fetchUserinfo(ctx, userinfoURL, tokens.AccessToken)
	}
	if err != nil {
		return nil, err
	}

	user, roles, err := EnsureAuthxUser(ctx, s.userRepo, claims)
	if err != nil {
		return nil, err
	}

	primary := pickPrimaryRole(roles)
	accessToken, expiresIn, err := MintProfilerAccessToken(user, primary, s.cfg)
	if err != nil {
		return nil, err
	}

	resp := &SessionTokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   expiresIn,
		TokenType:   "Bearer",
	}
	if tokens.RefreshToken != "" {
		resp.RefreshToken = tokens.RefreshToken
	}
	return resp, nil
}

// RevokeSession revokes the AuthX offline_access refresh token so an explicit
// logout is durable. Clearing the browser session alone leaves this token
// valid, letting the client silently re-mint a session via RefreshSession.
func (s *AuthxSessionService) RevokeSession(ctx context.Context, refreshToken string) error {
	if !s.cfg.Enabled {
		return errors.New("authx is not enabled")
	}
	if strings.TrimSpace(refreshToken) == "" {
		return errors.New("refresh_token is required")
	}
	if s.cfg.AuthIdpUrl == "" {
		return errors.New("AUTH_IDP_URL is not configured")
	}

	revokeURL := strings.TrimRight(s.cfg.AuthIdpUrl, "/") + "/api/oauth2/revoke"
	form := url.Values{
		"token":           {refreshToken},
		"token_type_hint": {"refresh_token"},
		"client_id":       {s.cfg.ClientID},
		"client_secret":   {s.cfg.ClientSecret},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, revokeURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("authx revoke request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("authx revoke failed: %s", string(body))
	}

	return nil
}

type oidcDiscovery struct {
	TokenEndpoint    string `json:"token_endpoint"`
	UserinfoEndpoint string `json:"userinfo_endpoint"`
}

type authxTokenResponse struct {
	AccessToken      string `json:"access_token"`
	IDToken          string `json:"id_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int    `json:"expires_in"`
	TokenType        string `json:"token_type"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func (s *AuthxSessionService) fetchOIDCDiscovery(ctx context.Context) (*oidcDiscovery, error) {
	if s.cfg.AuthIdpUrl == "" {
		return nil, errors.New("AUTH_IDP_URL is not configured")
	}
	discoveryURL := strings.TrimRight(s.cfg.AuthIdpUrl, "/") + "/api/auth/.well-known/openid-configuration"

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, discoveryURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("oidc discovery: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("oidc discovery failed (%d): %s", resp.StatusCode, string(body))
	}

	var d oidcDiscovery
	if err := json.Unmarshal(body, &d); err != nil {
		return nil, err
	}
	if d.TokenEndpoint == "" {
		return nil, errors.New("token_endpoint missing from oidc discovery")
	}
	return &d, nil
}

func (s *AuthxSessionService) refreshAuthxTokens(ctx context.Context, tokenEndpoint, refreshToken string) (*authxTokenResponse, error) {
	form := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {s.cfg.ClientID},
		"client_secret": {s.cfg.ClientSecret},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("authx refresh: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var tokens authxTokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 || (tokens.AccessToken == "" && tokens.IDToken == "") {
		msg := tokens.ErrorDescription
		if msg == "" {
			msg = tokens.Error
		}
		if msg == "" {
			msg = string(body)
		}
		return nil, fmt.Errorf("authx refresh failed: %s", msg)
	}
	return &tokens, nil
}

func (s *AuthxSessionService) fetchUserinfo(ctx context.Context, userinfoURL, accessToken string) (*AuthxIDTokenClaims, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userinfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("userinfo failed (%d): %s", resp.StatusCode, string(body))
	}

	var u struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.Unmarshal(body, &u); err != nil {
		return nil, err
	}
	if u.Sub == "" || u.Email == "" {
		return nil, errors.New("userinfo missing sub or email")
	}
	return &AuthxIDTokenClaims{
		Sub:   u.Sub,
		Email: strings.ToLower(strings.TrimSpace(u.Email)),
		Name:  u.Name,
	}, nil
}
