package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/profiler/backend/internal/model"
)

const (
	// ProfilerAccessTokenType marks tokens minted by profiler itself, so we can
	// distinguish them from raw AuthX id_tokens on the validation path.
	ProfilerAccessTokenType = "profiler_access"

	profilerAccessTokenTTL = 24 * time.Hour
)

// MintProfilerAccessToken issues an HS256 JWT that represents an authenticated
// profiler session. The `sub` claim is the profiler users.id — the validator
// short-circuits the resolver by looking up user by ID rather than IdP sub.
func MintProfilerAccessToken(user *model.User, primary model.UserRole, cfg AuthxConfig) (string, int64, error) {
	if cfg.ClientSecret == "" {
		return "", 0, errors.New("authx client secret is not configured")
	}

	now := time.Now()
	expiresAt := now.Add(profilerAccessTokenTTL)

	tok := jwt.New()
	if err := tok.Set(jwt.SubjectKey, user.ID.String()); err != nil {
		return "", 0, err
	}
	if err := tok.Set(jwt.IssuedAtKey, now); err != nil {
		return "", 0, err
	}
	if err := tok.Set(jwt.ExpirationKey, expiresAt); err != nil {
		return "", 0, err
	}
	if cfg.ClientID != "" {
		if err := tok.Set(jwt.AudienceKey, cfg.ClientID); err != nil {
			return "", 0, err
		}
	}
	if err := tok.Set("email", user.Email); err != nil {
		return "", 0, err
	}
	if err := tok.Set("name", user.Name); err != nil {
		return "", 0, err
	}
	if err := tok.Set("token_type", ProfilerAccessTokenType); err != nil {
		return "", 0, err
	}
	if primary.Role != "" {
		if err := tok.Set("role", primary.Role); err != nil {
			return "", 0, err
		}
	}
	if primary.InstitutionID != nil {
		if err := tok.Set("institution_id", primary.InstitutionID.String()); err != nil {
			return "", 0, err
		}
	}

	signed, err := jwt.Sign(tok, jwt.WithKey(jwa.HS256, []byte(cfg.ClientSecret)))
	if err != nil {
		return "", 0, fmt.Errorf("signing profiler access token: %w", err)
	}

	return string(signed), int64(profilerAccessTokenTTL.Seconds()), nil
}

// ParseProfilerAccessToken verifies an HS256 token minted by MintProfilerAccessToken.
// Returns Claims with ProfilerUserID populated so the resolver can skip the IdP-sub lookup.
func ParseProfilerAccessToken(ctx context.Context, rawToken string, cfg AuthxConfig) (*Claims, error) {
	if cfg.ClientSecret == "" {
		return nil, errors.New("authx client secret is not configured")
	}

	token, err := jwt.Parse(
		[]byte(rawToken),
		jwt.WithKey(jwa.HS256, []byte(cfg.ClientSecret)),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid profiler access token: %w", err)
	}

	tt, _ := token.Get("token_type")
	if s, _ := tt.(string); s != ProfilerAccessTokenType {
		return nil, errors.New("not a profiler access token")
	}

	if cfg.ClientID != "" && !audienceContains(token.Audience(), cfg.ClientID) {
		return nil, errors.New("profiler access token audience mismatch")
	}

	sub := token.Subject()
	if _, err := uuid.Parse(sub); err != nil {
		return nil, errors.New("profiler access token sub must be a UUID")
	}

	email, _ := token.Get("email")
	emailStr, _ := email.(string)
	name, _ := token.Get("name")
	nameStr, _ := name.(string)

	return &Claims{
		Sub:            sub,
		Email:          emailStr,
		EmailVerified:  true,
		Name:           nameStr,
		Audience:       token.Audience(),
		ProfilerUserID: sub,
	}, nil
}
