package auth

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// LoginExchange holds the OAuth code and state returned after a successful login.
type LoginExchange struct {
	Code         string `json:"code"`
	State        string `json:"state"`
	CodeVerifier string `json:"code_verifier"`
}

// TokenResponse holds tokens from Zitadel token endpoint.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token,omitempty"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// LoginClient performs Zitadel Session API + OIDC auth request finalization.
type LoginClient struct {
	issuer       string
	clientID     string
	apiAudience  string
	redirectURI  string
	serviceToken string
	loginClient  string
	orgID        string
	httpClient   *http.Client
}

func NewLoginClient(issuer, clientID, redirectURI, serviceToken, loginClientID, orgID, apiAudience string) *LoginClient {
	return &LoginClient{
		issuer:       strings.TrimRight(issuer, "/"),
		clientID:     clientID,
		apiAudience:  apiAudience,
		redirectURI:  redirectURI,
		serviceToken: serviceToken,
		loginClient:  loginClientID,
		orgID:        orgID,
		httpClient: &http.Client{
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

func (c *LoginClient) Enabled() bool {
	return c.serviceToken != ""
}

// LoginWithPassword authenticates via Zitadel Session API and finalizes the OIDC auth request.
// Returns code+state for the frontend /auth/callback flow (same as other Xcelerator apps).
// loginName is the Zitadel preferred login name (e.g. "Neerajgowda"), not always the user's email.
func (c *LoginClient) LoginWithPassword(loginName, password string) (*LoginExchange, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("ZITADEL_SERVICE_USER_TOKEN is not configured")
	}

	loginName = strings.TrimSpace(loginName)
	if loginName == "" {
		return nil, fmt.Errorf("login name is required")
	}

	codeVerifier, codeChallenge, err := generatePKCE()
	if err != nil {
		return nil, err
	}

	state, err := randomString(32)
	if err != nil {
		return nil, err
	}

	sessionID, sessionToken, err := c.createSession(loginName, password)
	if err != nil {
		return nil, err
	}

	authRequestID, err := c.createAuthRequest(state, codeChallenge)
	if err != nil {
		return nil, err
	}

	callbackURL, err := c.finalizeAuthRequest(authRequestID, sessionID, sessionToken)
	if err != nil {
		return nil, err
	}

	code, returnedState, err := parseCallbackURL(callbackURL)
	if err != nil {
		return nil, err
	}

	if returnedState != "" {
		state = returnedState
	}

	return &LoginExchange{
		Code:         code,
		State:        state,
		CodeVerifier: codeVerifier,
	}, nil
}

// ExchangeCode exchanges an authorization code for tokens.
func (c *LoginClient) ExchangeCode(code, codeVerifier string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("client_id", c.clientID)
	data.Set("redirect_uri", c.redirectURI)
	if codeVerifier != "" {
		data.Set("code_verifier", codeVerifier)
	}

	req, err := http.NewRequest(http.MethodPost, c.issuer+"/oauth/v2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokens TokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, err
	}

	// Zitadel web apps often return an opaque access_token; use id_token (always JWT) for API auth.
	if !isJWT(tokens.AccessToken) && isJWT(tokens.IDToken) {
		tokens.AccessToken = tokens.IDToken
	}

	return &tokens, nil
}

func isJWT(token string) bool {
	return strings.Count(token, ".") == 2 && strings.HasPrefix(token, "eyJ")
}

func (c *LoginClient) createSession(loginName, password string) (sessionID, sessionToken string, err error) {
	payload := map[string]any{
		"checks": map[string]any{
			"user": map[string]string{
				"loginName": loginName,
			},
			"password": map[string]string{
				"password": password,
			},
		},
	}

	var result struct {
		SessionID    string `json:"sessionId"`
		SessionToken string `json:"sessionToken"`
	}

	if err := c.postJSON("/v2/sessions", payload, &result); err != nil {
		return "", "", fmt.Errorf("session creation failed: %w", err)
	}

	if result.SessionID == "" || result.SessionToken == "" {
		return "", "", fmt.Errorf("incomplete session response from Zitadel")
	}

	return result.SessionID, result.SessionToken, nil
}

func (c *LoginClient) createAuthRequest(state, codeChallenge string) (string, error) {
	params := url.Values{}
	params.Set("client_id", c.clientID)
	params.Set("redirect_uri", c.redirectURI)
	params.Set("response_type", "code")
	scope := "openid profile email offline_access"
	if c.apiAudience != "" {
		scope += " urn:zitadel:iam:org:project:id:" + c.apiAudience + ":aud"
	}
	params.Set("scope", scope)
	params.Set("state", state)
	params.Set("code_challenge", codeChallenge)
	params.Set("code_challenge_method", "S256")

	reqURL := c.issuer + "/oauth/v2/authorize?" + params.Encode()
	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}
	c.setServiceHeaders(req)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Expect redirect to login UI with authRequest param.
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		location := resp.Header.Get("Location")
		if id := extractAuthRequestID(location); id != "" {
			return id, nil
		}
		return "", fmt.Errorf("authorize redirect missing authRequest: %s", location)
	}

	body, _ := io.ReadAll(resp.Body)
	return "", fmt.Errorf("authorize failed (%d): %s", resp.StatusCode, string(body))
}

func (c *LoginClient) finalizeAuthRequest(authRequestID, sessionID, sessionToken string) (string, error) {
	payload := map[string]any{
		"session": map[string]string{
			"sessionId":    sessionID,
			"sessionToken": sessionToken,
		},
	}

	var result struct {
		CallbackURL string `json:"callbackUrl"`
	}

	path := fmt.Sprintf("/v2/oidc/auth_requests/%s", authRequestID)
	if err := c.postJSON(path, payload, &result); err != nil {
		return "", fmt.Errorf("finalize auth request failed: %w", err)
	}

	if result.CallbackURL == "" {
		return "", fmt.Errorf("empty callback URL from Zitadel")
	}

	return result.CallbackURL, nil
}

func (c *LoginClient) postJSON(path string, payload any, dest any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, c.issuer+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	c.setServiceHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Zitadel API %s returned %d: %s", path, resp.StatusCode, string(respBody))
	}

	if dest != nil {
		if err := json.Unmarshal(respBody, dest); err != nil {
			return err
		}
	}
	return nil
}

func (c *LoginClient) setServiceHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	if c.loginClient != "" {
		req.Header.Set("x-zitadel-login-client", c.loginClient)
	}
	if c.orgID != "" {
		req.Header.Set("x-zitadel-orgid", c.orgID)
	}
}

func generatePKCE() (verifier, challenge string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	hash := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(hash[:])
	return verifier, challenge, nil
}

func randomString(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func extractAuthRequestID(location string) string {
	if location == "" {
		return ""
	}
	u, err := url.Parse(location)
	if err != nil {
		return ""
	}
	if id := u.Query().Get("authRequest"); id != "" {
		return id
	}
	if id := u.Query().Get("authRequestID"); id != "" {
		return id
	}
	// Path-style: /login?authRequest=V2_xxx
	for key, values := range u.Query() {
		if strings.EqualFold(key, "authRequest") && len(values) > 0 {
			return values[0]
		}
	}
	return ""
}

func parseCallbackURL(callbackURL string) (code, state string, err error) {
	u, err := url.Parse(callbackURL)
	if err != nil {
		return "", "", err
	}
	code = u.Query().Get("code")
	state = u.Query().Get("state")
	if code == "" {
		return "", "", fmt.Errorf("callback URL missing code: %s", callbackURL)
	}
	return code, state, nil
}
