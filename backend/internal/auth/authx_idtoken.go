package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

// AuthxIDTokenClaims are the fields we extract from an AuthX-issued id_token
// or from userinfo when refreshing.
type AuthxIDTokenClaims struct {
	Sub   string
	Email string
	Name  string
}

// ParseAuthxIDToken validates an AuthX-issued OIDC id_token.
// AuthX (better-auth) signs id_tokens with HS256 using the OAuth client_secret,
// so we verify with that same secret.
func ParseAuthxIDToken(ctx context.Context, rawToken string, cfg AuthxConfig) (*AuthxIDTokenClaims, error) {
	if cfg.ClientSecret == "" {
		return nil, errors.New("authx client secret is not configured")
	}

	token, err := jwt.Parse(
		[]byte(rawToken),
		jwt.WithKey(jwa.HS256, []byte(cfg.ClientSecret)),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid authx id_token: %w", err)
	}

	// Reject profiler-minted access tokens sneaking in through this path.
	if tt, ok := token.Get("token_type"); ok {
		if s, _ := tt.(string); s == ProfilerAccessTokenType {
			return nil, errors.New("expected AuthX id_token, got profiler access token")
		}
	}

	if cfg.ClientID != "" && !audienceContains(token.Audience(), cfg.ClientID) {
		return nil, fmt.Errorf("authx id_token audience mismatch (got %v, want %s)", token.Audience(), cfg.ClientID)
	}

	sub := token.Subject()
	if sub == "" {
		return nil, errors.New("authx id_token missing sub")
	}
	if _, err := uuid.Parse(sub); err != nil {
		return nil, errors.New("authx id_token sub must be a UUID")
	}

	email, _ := token.Get("email")
	emailStr, _ := email.(string)
	emailStr = strings.ToLower(strings.TrimSpace(emailStr))
	if emailStr == "" {
		return nil, errors.New("authx id_token missing email")
	}

	name, _ := token.Get("name")
	nameStr, _ := name.(string)
	if nameStr == "" {
		if preferred, ok := token.Get("preferred_username"); ok {
			nameStr, _ = preferred.(string)
		}
	}

	return &AuthxIDTokenClaims{
		Sub:   sub,
		Email: emailStr,
		Name:  nameStr,
	}, nil
}

func audienceContains(got []string, want string) bool {
	for _, a := range got {
		if a == want {
			return true
		}
	}
	return false
}
