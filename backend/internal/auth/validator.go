package auth

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

// Claims holds the parsed fields we care about from a Zitadel JWT.
type Claims struct {
	Sub           string
	Email         string
	EmailVerified bool
	Name          string
	Audience      []string
}

// Validator validates Zitadel-issued JWTs using a cached JWKS.
type Validator struct {
	issuer    string
	audiences []string
	cache     *jwk.Cache
	jwksURL   string
}

func NewValidator(issuer string, audiences []string, jwksURL string) (*Validator, error) {
	cache := jwk.NewCache(context.Background())

	if err := cache.Register(jwksURL, jwk.WithMinRefreshInterval(5*time.Minute)); err != nil {
		return nil, fmt.Errorf("registering JWKS URL: %w", err)
	}

	// Eagerly fetch keys so startup fails fast on misconfiguration.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := cache.Refresh(ctx, jwksURL); err != nil {
		return nil, fmt.Errorf("fetching JWKS on startup: %w", err)
	}

	return &Validator{
		issuer:    issuer,
		audiences: audiences,
		cache:     cache,
		jwksURL:   jwksURL,
	}, nil
}

// Validate parses and validates a raw JWT string.
// Returns the extracted Claims on success.
func (v *Validator) Validate(ctx context.Context, rawToken string) (*Claims, error) {
	claims, err := v.parseToken(ctx, rawToken)
	if err == nil {
		return claims, nil
	}

	// Zitadel may sign tokens with a newly rotated key before our JWKS cache refreshes.
	if isJWKSKeyMiss(err) {
		if _, refreshErr := v.cache.Refresh(ctx, v.jwksURL); refreshErr == nil {
			return v.parseToken(ctx, rawToken)
		}
	}

	return nil, err
}

func (v *Validator) parseToken(ctx context.Context, rawToken string) (*Claims, error) {
	keySet, err := v.cache.Get(ctx, v.jwksURL)
	if err != nil {
		return nil, fmt.Errorf("retrieving JWKS: %w", err)
	}

	token, err := jwt.Parse(
		[]byte(rawToken),
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(v.issuer),
		jwt.WithAcceptableSkew(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if !audienceMatches(token.Audience(), v.audiences) {
		return nil, fmt.Errorf("invalid token: audience mismatch (got %v, want one of %v)", token.Audience(), v.audiences)
	}

	email, _ := token.Get("email")
	emailStr, _ := email.(string)

	emailVerified, _ := token.Get("email_verified")
	emailVerifiedBool, _ := emailVerified.(bool)

	name, _ := token.Get("name")
	nameStr, _ := name.(string)
	if nameStr == "" {
		preferred, _ := token.Get("preferred_username")
		nameStr, _ = preferred.(string)
	}

	return &Claims{
		Sub:           token.Subject(),
		Email:         emailStr,
		EmailVerified: emailVerifiedBool,
		Name:          nameStr,
		Audience:      token.Audience(),
	}, nil
}

func isJWKSKeyMiss(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "failed to find key") || strings.Contains(msg, "no key ID")
}

func audienceMatches(got, want []string) bool {
	for _, expected := range want {
		for _, aud := range got {
			if aud == expected {
				return true
			}
		}
	}
	return false
}
