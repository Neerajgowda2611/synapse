package metric

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAccumulateConstructsUsesValidatedClaims(t *testing.T) {
	userID := uuid.New()
	now := time.Now().UTC()
	conv := 0.5
	disc := 0.1
	level := "scalar"

	signals := []ScoringSignal{
		{
			ID:                   uuid.New(),
			SignalType:           "message_rate",
			UserID:               userID,
			Value:                0.8,
			DerivedAt:            now.Add(-24 * time.Hour),
			DerivationConfidence: 1.0,
		},
		{
			ID:                   uuid.New(),
			SignalType:           "unknown_signal",
			UserID:               userID,
			Value:                0.1,
			DerivedAt:            now,
			DerivationConfidence: 1.0,
		},
	}

	claims := ClaimRegistry{
		Claims: map[string]ConstructClaim{
			"message_rate->communication": {
				SignalType: "message_rate",
				Trait:      "communication",
				Evidence: ValidityEvidence{
					ConvergentR:      &conv,
					DiscriminantMaxR: &disc,
					InvarianceLevel:  &level,
					DIFChecked:       true,
				},
			},
		},
	}

	estimates := AccumulateConstructs(
		signals,
		claims,
		map[string]NormSpec{"message_rate": {Kind: "clip_scale", Lo: 0, Hi: 1}},
		AccumulateOpts{
			AsOf:           now,
			FilterByUserID: &userID,
			AllowedTraits: map[string]struct{}{
				"communication": {},
			},
		},
	)
	estimate, ok := estimates["communication"]
	if !ok {
		t.Fatalf("expected communication estimate")
	}
	if estimate.Value <= 0 {
		t.Fatalf("expected positive estimate value, got %v", estimate.Value)
	}
	if estimate.Evidence.NSignals != 1 {
		t.Fatalf("expected one usable signal, got %d", estimate.Evidence.NSignals)
	}
}
