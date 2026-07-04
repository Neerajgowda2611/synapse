package observation

import (
	"testing"
	"time"
)

func TestValidateFields(t *testing.T) {
	schema := &TypeSchema{
		ObservationType: "mentorship_session_lifecycle",
		Fields: []FieldType{
			{Name: "session_event", Type: "str", Required: true},
			{Name: "session_status", Type: "str", Required: true},
			{Name: "scheduled_start_at", Type: "datetime", Required: false},
		},
	}

	fields := map[string]any{
		"session_event":      "booked",
		"session_status":     "scheduled",
		"scheduled_start_at": time.Now().UTC(),
	}
	if reason := ValidateFields(schema, fields); reason != "" {
		t.Fatalf("expected valid fields, got %q", reason)
	}

	missing := map[string]any{"session_status": "scheduled"}
	if reason := ValidateFields(schema, missing); reason == "" {
		t.Fatal("expected missing required field error")
	}
}
