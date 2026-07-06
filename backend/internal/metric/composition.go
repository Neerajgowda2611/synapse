package metric

import (
	"math"

	"github.com/google/uuid"
)

var highPoles = map[string]struct{}{
	"agency":        {},
	"risk":          {},
	"risk_appetite": {},
}

func ScoreRewardSystem(
	rs RewardSystem,
	estimates map[string]ConstructEstimate,
	userID uuid.UUID,
) (RewardScore, map[string]MetricReading) {
	readings := make(map[string]MetricReading, len(rs.Metrics))
	for _, md := range rs.Metrics {
		readings[md.MetricID] = ComposeMetric(md, estimates)
	}

	rawScore := 0.0
	variance := 0.0
	weightSum := 0.0
	suppressed := make([]string, 0)
	values := make(map[string]float64)
	for metricID, weight := range rs.MetricWeights {
		weightSum += weight
		reading, ok := readings[metricID]
		if !ok || !reading.Usable {
			suppressed = append(suppressed, metricID)
			continue
		}
		rawScore += weight * reading.Value
		variance += (weight * weight) * (sigma(reading.Confidence) * sigma(reading.Confidence))
		values[metricID] = reading.Value
	}

	normalizedScore := 0.0
	if weightSum > 0 {
		normalizedScore = clip(rawScore / weightSum)
	}
	std := math.Sqrt(variance)
	normalizedStd := std
	if weightSum > 0 {
		normalizedStd = std / weightSum
	}
	return RewardScore{
			RewardSystemID: rs.ID,
			UserID:         userID,
			Score:          round3(normalizedScore),
			RawScore:       round3(rawScore),
			WeightSum:      round3(weightSum),
			Confidence: ConfidenceInterval{
				Point: round3(normalizedScore),
				Lower: round3(clip(normalizedScore - Z95*normalizedStd)),
				Upper: round3(clip(normalizedScore + Z95*normalizedStd)),
				Level: 0.95,
			},
			MetricValues: values,
			Suppressed:   suppressed,
		},
		readings
}

func ComposeMetric(md MetricDefinition, estimates map[string]ConstructEstimate) MetricReading {
	if md.Kind == MetricKindReflective {
		if md.Trait == nil {
			return MetricReading{
				MetricID: md.MetricID,
				Kind:     md.Kind,
				Usable:   false,
			}
		}
		estimate, ok := estimates[*md.Trait]
		if !ok {
			return MetricReading{
				MetricID: md.MetricID,
				Kind:     md.Kind,
				Value:    0,
				Confidence: ConfidenceInterval{
					Point: 0,
					Lower: 0,
					Upper: 1,
					Level: 0.95,
				},
				Usable:  false,
				Missing: []string{*md.Trait},
			}
		}
		transformedValue := applyShape(estimate.Value, md)
		transformedCI := transformCI(estimate.Confidence, md)
		return MetricReading{
			MetricID:   md.MetricID,
			Kind:       md.Kind,
			Value:      round3(transformedValue),
			Confidence: transformedCI,
			Usable:     true,
			Components: map[string]float64{*md.Trait: 1.0},
		}
	}

	value := 0.0
	variance := 0.0
	missing := make([]string, 0)
	components := make(map[string]float64, len(md.Components))
	for trait, weight := range md.Components {
		estimate, ok := estimates[trait]
		if !ok {
			missing = append(missing, trait)
			continue
		}
		value += weight * estimate.Value
		estimateSigma := sigma(estimate.Confidence)
		variance += (weight * weight) * (estimateSigma * estimateSigma)
		components[trait] = weight
	}
	std := math.Sqrt(variance)
	return MetricReading{
		MetricID: md.MetricID,
		Kind:     md.Kind,
		Value:    round3(value),
		Confidence: ConfidenceInterval{
			Point: round3(value),
			Lower: round3(value - Z95*std),
			Upper: round3(value + Z95*std),
			Level: 0.95,
		},
		Usable:     len(missing) == 0,
		Components: components,
		Missing:    missing,
	}
}

func sigma(ci ConfidenceInterval) float64 {
	return (ci.Upper - ci.Lower) / (2 * Z95)
}

func applyShape(value float64, md MetricDefinition) float64 {
	switch md.Shape {
	case MetricShapePeaked:
		peak := 0.55
		if md.Peak != nil {
			peak = *md.Peak
		}
		return peakedValue(value, peak)
	case MetricShapeBipolar:
		return bipolarValue(value, md.Pole)
	default:
		return value
	}
}

func transformCI(ci ConfidenceInterval, md MetricDefinition) ConfidenceInterval {
	if md.Shape == MetricShapeMonotonic {
		return ci
	}
	lower := applyShape(ci.Lower, md)
	upper := applyShape(ci.Upper, md)
	point := applyShape(ci.Point, md)
	return ConfidenceInterval{
		Point: round3(point),
		Lower: round3(math.Min(point, math.Min(lower, upper))),
		Upper: round3(math.Max(point, math.Max(lower, upper))),
		Level: ci.Level,
	}
}

func peakedValue(value, peak float64) float64 {
	denom := math.Max(peak, 1.0-peak)
	if denom <= 0 {
		return 0
	}
	return clip(1.0 - math.Abs(value-peak)/denom)
}

func bipolarValue(value float64, pole *string) float64 {
	if pole == nil {
		return value
	}
	if _, ok := highPoles[*pole]; ok {
		return value
	}
	return 1.0 - value
}
