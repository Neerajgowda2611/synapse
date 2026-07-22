package xint

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestProfileLinkSignerIssueAndVerify(t *testing.T) {
	now := time.Date(2026, 7, 16, 12, 0, 0, 0, time.UTC)
	signer, err := NewProfileLinkSigner("test-secret", time.Hour, "https://profiler.example.com")
	if err != nil {
		t.Fatal(err)
	}
	signer.now = func() time.Time { return now }

	targetID := uuid.New()
	userID := uuid.New()
	token, profileURL, err := signer.Issue(targetID, userID, "projex")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(profileURL, "https://profiler.example.com/project-fit?token=") {
		t.Fatalf("unexpected profile URL: %s", profileURL)
	}

	claims, err := signer.Verify(token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.TargetID != targetID || claims.UserID != userID || claims.Source != "projex" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestProfileLinkSignerRejectsTamperingAndExpiry(t *testing.T) {
	now := time.Date(2026, 7, 16, 12, 0, 0, 0, time.UTC)
	signer, err := NewProfileLinkSigner("test-secret", time.Hour, "https://profiler.example.com")
	if err != nil {
		t.Fatal(err)
	}
	signer.now = func() time.Time { return now }

	token, _, err := signer.Issue(uuid.New(), uuid.New(), "projex")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := signer.Verify(token + "tampered"); !errors.Is(err, ErrInvalidProfileLink) {
		t.Fatalf("got %v, want invalid profile link", err)
	}

	signer.now = func() time.Time { return now.Add(time.Hour) }
	if _, err := signer.Verify(token); !errors.Is(err, ErrExpiredProfileLink) {
		t.Fatalf("got %v, want expired profile link", err)
	}
}
