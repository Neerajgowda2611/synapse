package service

import (
	"testing"

	"github.com/profiler/backend/internal/metric"
)

func TestBuildBatchFitTraitScores(t *testing.T) {
	result := &JobFitResult{
		MetricWeights: map[string]float64{
			"metric:agency":        1.0,
			"metric:collaboration": 0.5,
		},
		Score: metric.RewardScore{WeightSum: 1.5},
		Readings: map[string]metric.MetricReading{
			"metric:agency": {
				MetricID:   "metric:agency",
				Kind:       metric.MetricKindReflective,
				Value:      0.8,
				Usable:     true,
				Components: map[string]float64{"agency": 1},
			},
			"metric:collaboration": {
				MetricID:   "metric:collaboration",
				Kind:       metric.MetricKindReflective,
				Value:      0.6,
				Usable:     true,
				Components: map[string]float64{"collaboration": 1},
			},
		},
		Estimates: map[string]metric.ConstructEstimate{
			"agency":        {Trait: "agency", Value: 0.75},
			"collaboration": {Trait: "collaboration", Value: 0.65},
		},
	}

	traits := buildBatchFitTraitScores(result)
	if len(traits) != 2 {
		t.Fatalf("got %d traits, want 2", len(traits))
	}

	agency := traits[0]
	if agency.Trait != "agency" {
		t.Fatalf("got first trait %q, want agency", agency.Trait)
	}
	if agency.TraitPercent != 75 || agency.FitPercent != 80 {
		t.Fatalf("got agency percentages trait=%v fit=%v, want 75 and 80", agency.TraitPercent, agency.FitPercent)
	}
	if agency.ContributionPercent != 53.3 {
		t.Fatalf("got agency contribution %v, want 53.3", agency.ContributionPercent)
	}

	collaboration := traits[1]
	if collaboration.ContributionPercent != 20 {
		t.Fatalf("got collaboration contribution %v, want 20", collaboration.ContributionPercent)
	}
}
