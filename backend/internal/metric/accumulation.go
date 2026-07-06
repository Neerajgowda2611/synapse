package metric

import (
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
)

type AccumulateOpts struct {
	AsOf            time.Time
	HalfLifeDays    float64
	BaseUncertainty float64
	AllowedTraits   map[string]struct{}
	FilterByUserID  *uuid.UUID
	DefaultNormLo   float64
	DefaultNormHi   float64
	DefaultNormKind string
}

func RunTraitPipeline(
	signals []ScoringSignal,
	claims ClaimRegistry,
	register ConstructRegister,
	norms map[string]NormSpec,
	userID uuid.UUID,
	asOf time.Time,
) map[string]ConstructEstimate {
	surfacedIDs := register.Surfaceable(claims)
	allowed := make(map[string]struct{}, len(surfacedIDs))
	for _, id := range surfacedIDs {
		entry, ok := register.Entries[id]
		if !ok {
			continue
		}
		allowed[entry.Trait] = struct{}{}
	}

	return AccumulateConstructs(signals, claims, norms, AccumulateOpts{
		AsOf:            asOf,
		HalfLifeDays:    HalfLifeDays,
		BaseUncertainty: BaseUncertainty,
		AllowedTraits:   allowed,
		FilterByUserID:  &userID,
	})
}

func AccumulateConstructs(
	signals []ScoringSignal,
	claims ClaimRegistry,
	norms map[string]NormSpec,
	opts AccumulateOpts,
) map[string]ConstructEstimate {
	if norms == nil {
		norms = map[string]NormSpec{}
	}
	asOf := opts.AsOf
	if asOf.IsZero() {
		asOf = time.Now().UTC()
	}
	halfLife := opts.HalfLifeDays
	if halfLife <= 0 {
		halfLife = HalfLifeDays
	}
	baseUncertainty := opts.BaseUncertainty
	if baseUncertainty <= 0 {
		baseUncertainty = BaseUncertainty
	}

	usable := map[string]ConstructClaim{}
	for _, claim := range claims.Claims {
		status := claim.Status()
		if status == ValidationStatusValidated || status == ValidationStatusSurfaced {
			usable[claim.SignalType] = claim
		}
	}

	type weightedSignal struct {
		normValue float64
		weight    float64
		signal    ScoringSignal
	}
	buckets := map[string][]weightedSignal{}

	for _, signal := range signals {
		if opts.FilterByUserID != nil && signal.UserID != *opts.FilterByUserID {
			continue
		}
		claim, ok := usable[signal.SignalType]
		if !ok {
			continue
		}
		if opts.AllowedTraits != nil {
			if _, allowed := opts.AllowedTraits[claim.Trait]; !allowed {
				continue
			}
		}
		norm := norms[signal.SignalType]
		value := normalize(signal.Value, norm)
		if claim.Direction == "negative" {
			value = 1.0 - value
		}
		ageDays := asOf.Sub(alignTimezone(signal.DerivedAt, asOf)).Hours() / 24.0
		weight := math.Max(0.0, signal.DerivationConfidence) * decay(ageDays, halfLife)
		if weight <= 0 {
			continue
		}
		buckets[claim.Trait] = append(buckets[claim.Trait], weightedSignal{
			normValue: value,
			weight:    weight,
			signal:    signal,
		})
	}

	out := make(map[string]ConstructEstimate, len(buckets))
	for trait, items := range buckets {
		sumW := 0.0
		sumW2 := 0.0
		weightedValue := 0.0
		distinctTypes := map[string]struct{}{}
		observationIDs := map[uuid.UUID]struct{}{}
		derivedSignalIDs := make([]uuid.UUID, 0, len(items))
		var mostRecent *time.Time

		for _, item := range items {
			sumW += item.weight
			sumW2 += item.weight * item.weight
			weightedValue += item.normValue * item.weight
			distinctTypes[item.signal.SignalType] = struct{}{}
			derivedSignalIDs = append(derivedSignalIDs, item.signal.ID)
			for _, observationID := range item.signal.DerivedFrom {
				observationIDs[observationID] = struct{}{}
			}
			if mostRecent == nil || item.signal.DerivedAt.After(*mostRecent) {
				ts := item.signal.DerivedAt
				mostRecent = &ts
			}
		}
		if sumW == 0 || sumW2 == 0 {
			continue
		}
		point := weightedValue / sumW
		nEff := (sumW * sumW) / sumW2
		sigma := baseUncertainty / math.Sqrt(nEff)
		var userID uuid.UUID
		if opts.FilterByUserID != nil {
			userID = *opts.FilterByUserID
		}
		sort.Slice(derivedSignalIDs, func(i, j int) bool {
			return derivedSignalIDs[i].String() < derivedSignalIDs[j].String()
		})
		out[trait] = ConstructEstimate{
			UserID: userID,
			Trait:  trait,
			Value:  round3(point),
			Confidence: ConfidenceInterval{
				Point: round3(point),
				Lower: round3(clip(point - Z95*sigma)),
				Upper: round3(clip(point + Z95*sigma)),
				Level: 0.95,
			},
			Evidence: EvidenceDensity{
				NSignals:            len(items),
				NEffective:          round2(nEff),
				DistinctSignalTypes: len(distinctTypes),
				NObservations:       len(observationIDs),
			},
			MostRecentSignalAt: mostRecent,
			DerivedFrom:        derivedSignalIDs,
		}
	}

	return out
}

func normalize(value float64, norm NormSpec) float64 {
	kind := norm.Kind
	if kind == "" {
		kind = "identity"
	}
	switch kind {
	case "binary":
		if value > 0 {
			return 1.0
		}
		return 0.0
	case "clip_scale":
		if norm.Hi == norm.Lo {
			return 0.0
		}
		return clip((value - norm.Lo) / (norm.Hi - norm.Lo))
	default:
		return clip(value)
	}
}

func decay(ageDays float64, halfLife float64) float64 {
	if halfLife <= 0 {
		return 1.0
	}
	return math.Pow(0.5, ageDays/halfLife)
}

func alignTimezone(signalTime, ref time.Time) time.Time {
	if signalTime.Location() != ref.Location() {
		return signalTime.In(ref.Location())
	}
	return signalTime
}

func clip(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}

func round3(v float64) float64 {
	return math.Round(v*1000) / 1000
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
