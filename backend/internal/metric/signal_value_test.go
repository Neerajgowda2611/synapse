package metric

import (
	"testing"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
)

func TestExtractSignalValue(t *testing.T) {
	value, err := ExtractSignalValue(model.JSONB(`{"value": 0.73}`))
	if err != nil {
		t.Fatalf("extract signal value: %v", err)
	}
	if value != 0.73 {
		t.Fatalf("expected 0.73 got %v", value)
	}
}

func TestDecodeDerivedFrom(t *testing.T) {
	id := uuid.New()
	got, err := DecodeDerivedFrom(model.JSONB(`["` + id.String() + `"]`))
	if err != nil {
		t.Fatalf("decode derived from: %v", err)
	}
	if len(got) != 1 || got[0] != id {
		t.Fatalf("unexpected decoded ids: %v", got)
	}
}
