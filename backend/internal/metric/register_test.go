package metric

import "testing"

func TestEvaluateGateSurfaceableWithTwoValidatedClaims(t *testing.T) {
	r := ConstructRegisterEntry{
		ConstructID:         "communication",
		Trait:               "communication",
		Definition:          "Communication trait",
		ScientificRationale: "Has evidence",
		LegitimacyRationale: "Useful to rank fit",
		SupportingSignals:   []string{"message_rate", "comment_rate"},
		RequiredObservs:     []string{"mentorship_message_event"},
		SourceApps:          []string{"mentorship"},
		Fairness: FairnessStatus{
			DIFChecked: true,
		},
		UncertaintyPolicy: "Suppress below n_eff=3",
	}
	conv := 0.4
	disc := 0.1
	level := "scalar"
	claims := ClaimRegistry{
		Claims: map[string]ConstructClaim{
			"message": {
				SignalType: "message_rate",
				Trait:      "communication",
				Evidence: ValidityEvidence{
					ConvergentR:      &conv,
					DiscriminantMaxR: &disc,
					InvarianceLevel:  &level,
					DIFChecked:       true,
				},
			},
			"comment": {
				SignalType: "comment_rate",
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

	report := EvaluateGate(r, claims)
	if !report.Surfaceable() {
		t.Fatalf("expected communication construct to be surfaceable")
	}
}
