package service

import (
	"testing"

	"github.com/profiler/backend/internal/metric"
)

func TestBuildProjectFitTraitDetails(t *testing.T) {
	result := &JobFitResult{
		MetricWeights: map[string]float64{"agency": 2, "collaboration": 1},
		Score:         metric.RewardScore{WeightSum: 3},
		Readings: map[string]metric.MetricReading{
			"agency": {
				MetricID:   "agency",
				Kind:       metric.MetricKindReflective,
				Value:      0.8,
				Usable:     true,
				Components: map[string]float64{"agency": 1},
			},
			"collaboration": {
				MetricID:   "collaboration",
				Kind:       metric.MetricKindReflective,
				Value:      0.6,
				Usable:     true,
				Components: map[string]float64{"collaboration": 1},
			},
		},
		Estimates: map[string]metric.ConstructEstimate{
			"agency": {
				Trait: "agency",
				Value: 0.75,
				Evidence: metric.EvidenceDensity{
					NEffective: 4,
				},
			},
			"collaboration": {
				Trait: "collaboration",
				Value: 0.65,
			},
		},
	}

	details := buildProjectFitTraitDetails(result)
	if len(details) != 2 {
		t.Fatalf("got %d traits, want 2", len(details))
	}
	if details[0].Trait != "agency" {
		t.Fatalf("got first trait %q, want agency", details[0].Trait)
	}
	if details[0].WeightSharePercent != 66.7 {
		t.Fatalf("got weight share %v, want 66.7", details[0].WeightSharePercent)
	}
	if details[0].TraitPercent != 75 || details[0].FitPercent != 80 {
		t.Fatalf(
			"got percentages trait=%v fit=%v, want 75 and 80",
			details[0].TraitPercent,
			details[0].FitPercent,
		)
	}
	if details[0].ContributionPercent != 53.3 {
		t.Fatalf("got contribution %v, want 53.3", details[0].ContributionPercent)
	}
	if details[0].Evidence.NEffective != 4 {
		t.Fatalf("got effective evidence %v, want 4", details[0].Evidence.NEffective)
	}
}
