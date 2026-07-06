package metric

import (
	"testing"

	"github.com/google/uuid"
)

func TestScoreRewardSystemNormalized(t *testing.T) {
	rs := RewardSystem{
		ID: "startup_engineer",
		MetricWeights: map[string]float64{
			"creativity": 0.7,
			"agency":     1.0,
		},
		Metrics: []MetricDefinition{
			{MetricID: "creativity", Kind: MetricKindReflective, Trait: strPtr("creativity"), Shape: MetricShapeMonotonic},
			{MetricID: "agency", Kind: MetricKindReflective, Trait: strPtr("agency"), Shape: MetricShapeMonotonic},
		},
	}
	estimates := map[string]ConstructEstimate{
		"creativity": {Trait: "creativity", Value: 1.0, Confidence: ConfidenceInterval{Point: 1.0, Lower: 0.8, Upper: 1.0, Level: 0.95}},
	}
	userID := uuid.MustParse("0432feb7-823e-49d4-bbca-9b3e94b463ae")

	score, readings := ScoreRewardSystem(rs, estimates, userID)

	if score.RawScore != 0.7 {
		t.Fatalf("expected raw score 0.7, got %v", score.RawScore)
	}
	if score.WeightSum != 1.7 {
		t.Fatalf("expected weight sum 1.7, got %v", score.WeightSum)
	}
	want := round3(0.7 / 1.7)
	if score.Score != want {
		t.Fatalf("expected normalized score %v, got %v", want, score.Score)
	}
	if len(score.Suppressed) != 1 || score.Suppressed[0] != "agency" {
		t.Fatalf("expected agency suppressed, got %+v", score.Suppressed)
	}
	if !readings["creativity"].Usable {
		t.Fatalf("expected creativity reading to be usable")
	}
}

func strPtr(s string) *string {
	return &s
}

func TestPeakedValueBestNearPeak(t *testing.T) {
	peak := 0.55
	atPeak := peakedValue(0.55, peak)
	low := peakedValue(0.0, peak)
	high := peakedValue(1.0, peak)
	if atPeak != 1.0 {
		t.Fatalf("expected 1.0 at peak, got %v", atPeak)
	}
	if !(low < atPeak && high < atPeak) {
		t.Fatalf("expected low/high away from peak to be lower")
	}
}

func TestBipolarCompliancePoleInverts(t *testing.T) {
	pole := "compliance"
	md := MetricDefinition{
		MetricID: "agency",
		Kind:     MetricKindReflective,
		Shape:    MetricShapeBipolar,
		Pole:     &pole,
	}
	got := applyShape(0.8, md)
	if abs(got-0.2) > 1e-9 {
		t.Fatalf("expected 0.2 after inversion, got %v", got)
	}
}

func TestTransformCIForPeakedShape(t *testing.T) {
	peak := 0.55
	md := MetricDefinition{
		MetricID: "help_seeking",
		Kind:     MetricKindReflective,
		Shape:    MetricShapePeaked,
		Peak:     &peak,
	}
	out := transformCI(ConfidenceInterval{
		Point: 0.55,
		Lower: 0.3,
		Upper: 0.8,
		Level: 0.95,
	}, md)
	if !(out.Lower <= out.Point && out.Point <= out.Upper) {
		t.Fatalf("expected transformed ci to contain point: %+v", out)
	}
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
