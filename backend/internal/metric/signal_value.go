package metric

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
)

type numericValuePayload struct {
	Value float64 `json:"value"`
}

func SignalToScoringSignal(sig model.Signal) (ScoringSignal, error) {
	value, err := ExtractSignalValue(sig.Value)
	if err != nil {
		return ScoringSignal{}, err
	}
	derivedFrom, err := DecodeDerivedFrom(sig.DerivedFrom)
	if err != nil {
		return ScoringSignal{}, err
	}
	return ScoringSignal{
		ID:                   sig.ID,
		SignalType:           sig.SignalType,
		UserID:               sig.UserID,
		Value:                value,
		DerivedAt:            sig.DerivedAt,
		DerivationConfidence: sig.DerivationConfidence,
		DerivedFrom:          derivedFrom,
	}, nil
}

func ExtractSignalValue(raw model.JSONB) (float64, error) {
	var payload numericValuePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return 0, err
	}
	return payload.Value, nil
}

func DecodeDerivedFrom(raw model.JSONB) ([]uuid.UUID, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var ids []string
	if err := json.Unmarshal(raw, &ids); err != nil {
		return nil, err
	}
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if id == "" {
			continue
		}
		parsed, err := uuid.Parse(id)
		if err != nil {
			return nil, fmt.Errorf("invalid observation uuid %q: %w", id, err)
		}
		out = append(out, parsed)
	}
	return out, nil
}
