package xint

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidProfileLink = errors.New("invalid profile link")
	ErrExpiredProfileLink = errors.New("expired profile link")
)

type ProfileLinkClaims struct {
	TargetID uuid.UUID `json:"target_id"`
	UserID   uuid.UUID `json:"user_id"`
	Source   string    `json:"source"`
	Expires  int64     `json:"exp"`
}

type ProfileLinkSigner struct {
	secret      []byte
	ttl         time.Duration
	frontendURL string
	now         func() time.Time
}

func NewProfileLinkSigner(secret string, ttl time.Duration, frontendURL string) (*ProfileLinkSigner, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return nil, fmt.Errorf("profile link signing secret is required")
	}
	if ttl <= 0 {
		return nil, fmt.Errorf("profile link ttl must be positive")
	}
	frontendURL = strings.TrimRight(strings.TrimSpace(frontendURL), "/")
	parsedFrontendURL, err := url.Parse(frontendURL)
	if err != nil ||
		(parsedFrontendURL.Scheme != "http" && parsedFrontendURL.Scheme != "https") ||
		parsedFrontendURL.Host == "" {
		return nil, fmt.Errorf("valid frontend URL is required")
	}
	return &ProfileLinkSigner{
		secret:      []byte(secret),
		ttl:         ttl,
		frontendURL: frontendURL,
		now:         time.Now,
	}, nil
}

func (s *ProfileLinkSigner) Issue(targetID, userID uuid.UUID, source string) (string, string, error) {
	if targetID == uuid.Nil || userID == uuid.Nil || strings.TrimSpace(source) == "" {
		return "", "", fmt.Errorf("%w: target, user, and source are required", ErrInvalidProfileLink)
	}
	claims := ProfileLinkClaims{
		TargetID: targetID,
		UserID:   userID,
		Source:   strings.TrimSpace(source),
		Expires:  s.now().UTC().Add(s.ttl).Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", "", err
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.sign(encodedPayload)
	token := encodedPayload + "." + base64.RawURLEncoding.EncodeToString(signature)
	profileURL := s.frontendURL + "/project-fit?token=" + url.QueryEscape(token)
	return token, profileURL, nil
}

func (s *ProfileLinkSigner) Verify(token string) (*ProfileLinkClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, ErrInvalidProfileLink
	}
	providedSignature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(providedSignature, s.sign(parts[0])) {
		return nil, ErrInvalidProfileLink
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidProfileLink
	}
	var claims ProfileLinkClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, ErrInvalidProfileLink
	}
	if claims.TargetID == uuid.Nil || claims.UserID == uuid.Nil || strings.TrimSpace(claims.Source) == "" {
		return nil, ErrInvalidProfileLink
	}
	if s.now().UTC().Unix() >= claims.Expires {
		return nil, ErrExpiredProfileLink
	}
	return &claims, nil
}

func (s *ProfileLinkSigner) sign(payload string) []byte {
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(payload))
	return mac.Sum(nil)
}
