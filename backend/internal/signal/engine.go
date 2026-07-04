package signal

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/observation"
)

const (
	PrimitivePassthrough = "passthrough"
	PrimitiveTimeliness  = "timeliness"
	PrimitiveThreshold   = "threshold"
	PrimitiveCount       = "count"
	PrimitiveRate        = "rate"
	PrimitiveMean        = "mean"
	PrimitiveTrend       = "trend"
	PrimitiveDispersion  = "dispersion"
	PrimitiveComparative = "comparative"
)

type WindowSpec struct {
	Kind    string   `json:"kind"`
	Days    *int     `json:"days"`
	MinN    int      `json:"min_n"`
	TargetN int      `json:"target_n"`
	GroupBy []string `json:"group_by"`
}

type ValueFromSpec struct {
	Field     *string        `json:"field"`
	Constant  *float64       `json:"constant"`
	Primitive *string        `json:"primitive"`
	Bindings  map[string]any `json:"bindings"`
	Params    map[string]any `json:"params"`
}

type DerivationRuleSpec struct {
	RuleID                string         `json:"rule_id"`
	Version               string         `json:"version"`
	Primitive             string         `json:"primitive"`
	OutputSignalType      string         `json:"output_signal_type"`
	InputObservationTypes []string       `json:"input_observation_types"`
	Bindings              map[string]any `json:"bindings"`
	Params                map[string]any `json:"params"`
	Window                *WindowSpec    `json:"window,omitempty"`
	ValueFrom             *ValueFromSpec `json:"value_from,omitempty"`
	InferenceMethod       string         `json:"inference_method,omitempty"`
	BaseConfidence        float64        `json:"base_confidence,omitempty"`
	Status                string         `json:"status,omitempty"`
}

type EmittedSignal struct {
	Signal         model.Signal
	ObservationIDs []uuid.UUID
}

type EmittedSkip struct {
	Skip model.DerivationSkip
}

type windowSeriesItem struct {
	when  time.Time
	value float64
	id    uuid.UUID
}

func ParseRuleSpec(raw json.RawMessage) (*DerivationRuleSpec, error) {
	var spec DerivationRuleSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		return nil, err
	}
	if strings.TrimSpace(spec.InferenceMethod) == "" {
		spec.InferenceMethod = "rule"
	}
	if spec.BaseConfidence <= 0 {
		spec.BaseConfidence = 1.0
	}
	if spec.Window != nil {
		if spec.Window.MinN <= 0 {
			spec.Window.MinN = 1
		}
		if spec.Window.TargetN <= 0 {
			spec.Window.TargetN = 5
		}
	}
	return &spec, nil
}

func IsPointPrimitive(primitive string) bool {
	switch primitive {
	case PrimitivePassthrough, PrimitiveTimeliness, PrimitiveThreshold:
		return true
	default:
		return false
	}
}

func DeriveForObservation(obs model.CanonicalObservation, rules []DerivationRuleSpec, asOf time.Time) ([]EmittedSignal, []EmittedSkip) {
	fields, err := decodeFields(obs.Fields)
	if err != nil {
		return nil, []EmittedSkip{{
			Skip: model.DerivationSkip{
				RuleID:           "decode_fields",
				OutputSignalType: "",
				UserID:           &obs.UserID,
				Reason:           "invalid canonical fields JSON",
				ObservationIDs:   marshalObservationIDs([]uuid.UUID{obs.ID}),
			},
		}}
	}

	var signals []EmittedSignal
	var skips []EmittedSkip

	for _, rule := range rules {
		if !IsPointPrimitive(rule.Primitive) || !matchesObservationType(rule, obs.ObservationType) {
			continue
		}
		value, err := evalPointPrimitive(rule.Primitive, fields, rule.Bindings, rule.Params)
		if err != nil {
			skips = append(skips, EmittedSkip{
				Skip: model.DerivationSkip{
					RuleID:           rule.RuleID,
					OutputSignalType: rule.OutputSignalType,
					UserID:           &obs.UserID,
					Reason:           "missing/invalid field: " + err.Error(),
					ObservationIDs:   marshalObservationIDs([]uuid.UUID{obs.ID}),
				},
			})
			continue
		}
		now := time.Now().UTC()
		signals = append(signals, EmittedSignal{
			Signal: model.Signal{
				SignalType:           rule.OutputSignalType,
				UserID:               obs.UserID,
				Value:                mustMarshalJSONB(map[string]any{"value": value}),
				DerivedAt:            now,
				InferenceMethod:      rule.InferenceMethod,
				DerivedFrom:          marshalObservationIDs([]uuid.UUID{obs.ID}),
				RuleID:               rule.RuleID,
				RuleVersion:          defaultString(rule.Version, "1.0.0"),
				DerivationConfidence: rule.BaseConfidence,
			},
			ObservationIDs: []uuid.UUID{obs.ID},
		})
	}
	return signals, skips
}

func DeriveForUser(observations []model.CanonicalObservation, rules []DerivationRuleSpec, asOf time.Time, userID uuid.UUID) ([]EmittedSignal, []EmittedSkip) {
	visible := make([]model.CanonicalObservation, 0, len(observations))
	for _, obs := range observations {
		if obs.OccurredAt.After(asOf) {
			continue
		}
		visible = append(visible, obs)
	}

	var signals []EmittedSignal
	var skips []EmittedSkip
	now := time.Now().UTC()

	for _, rule := range rules {
		relevant := make([]model.CanonicalObservation, 0, len(visible))
		for _, obs := range visible {
			if matchesObservationType(rule, obs.ObservationType) {
				relevant = append(relevant, obs)
			}
		}
		if len(relevant) == 0 {
			continue
		}

		if IsPointPrimitive(rule.Primitive) {
			pointSignals, pointSkips := DerivePointOverObservations(relevant, rule, now)
			signals = append(signals, pointSignals...)
			skips = append(skips, pointSkips...)
			continue
		}

		emittedSignal, emittedSkip := deriveWindowRule(relevant, rule, userID, asOf, now)
		if emittedSignal != nil {
			signals = append(signals, *emittedSignal)
		}
		if emittedSkip != nil {
			skips = append(skips, *emittedSkip)
		}
	}
	return signals, skips
}

func DerivePointOverObservations(observations []model.CanonicalObservation, rule DerivationRuleSpec, derivedAt time.Time) ([]EmittedSignal, []EmittedSkip) {
	signals := make([]EmittedSignal, 0, len(observations))
	skips := make([]EmittedSkip, 0)
	for _, obs := range observations {
		fields, err := decodeFields(obs.Fields)
		if err != nil {
			skips = append(skips, EmittedSkip{
				Skip: model.DerivationSkip{
					RuleID:           rule.RuleID,
					OutputSignalType: rule.OutputSignalType,
					UserID:           &obs.UserID,
					Reason:           "invalid canonical fields JSON",
					ObservationIDs:   marshalObservationIDs([]uuid.UUID{obs.ID}),
				},
			})
			continue
		}
		value, err := evalPointPrimitive(rule.Primitive, fields, rule.Bindings, rule.Params)
		if err != nil {
			skips = append(skips, EmittedSkip{
				Skip: model.DerivationSkip{
					RuleID:           rule.RuleID,
					OutputSignalType: rule.OutputSignalType,
					UserID:           &obs.UserID,
					Reason:           "missing/invalid field: " + err.Error(),
					ObservationIDs:   marshalObservationIDs([]uuid.UUID{obs.ID}),
				},
			})
			continue
		}
		signals = append(signals, EmittedSignal{
			Signal: model.Signal{
				SignalType:           rule.OutputSignalType,
				UserID:               obs.UserID,
				Value:                mustMarshalJSONB(map[string]any{"value": value}),
				DerivedAt:            derivedAt,
				InferenceMethod:      rule.InferenceMethod,
				DerivedFrom:          marshalObservationIDs([]uuid.UUID{obs.ID}),
				RuleID:               rule.RuleID,
				RuleVersion:          defaultString(rule.Version, "1.0.0"),
				DerivationConfidence: rule.BaseConfidence,
			},
			ObservationIDs: []uuid.UUID{obs.ID},
		})
	}
	return signals, skips
}

func deriveWindowRule(observations []model.CanonicalObservation, rule DerivationRuleSpec, userID uuid.UUID, asOf, derivedAt time.Time) (*EmittedSignal, *EmittedSkip) {
	win := rule.Window
	if win == nil {
		win = &WindowSpec{Kind: "all", MinN: 1, TargetN: 5}
	}
	if win.MinN <= 0 {
		win.MinN = 1
	}
	if win.TargetN <= 0 {
		win.TargetN = 5
	}

	filtered := filterWindowObservations(observations, asOf, win)
	observationIDs := collectObservationIDs(filtered)
	if len(filtered) == 0 {
		return nil, &EmittedSkip{
			Skip: model.DerivationSkip{
				RuleID:           rule.RuleID,
				OutputSignalType: rule.OutputSignalType,
				UserID:           &userID,
				Reason:           "insufficient evidence: 0 observations",
				ObservationIDs:   marshalObservationIDs(observationIDs),
			},
		}
	}

	series := make([]windowSeriesItem, 0, len(filtered))
	for _, obs := range filtered {
		fields, err := decodeFields(obs.Fields)
		if err != nil {
			continue
		}
		val, err := perObservationScalar(fields, rule)
		if err != nil {
			continue
		}
		series = append(series, windowSeriesItem{when: obs.OccurredAt.UTC(), value: val, id: obs.ID})
	}
	if len(series) < win.MinN {
		return nil, &EmittedSkip{
			Skip: model.DerivationSkip{
				RuleID:           rule.RuleID,
				OutputSignalType: rule.OutputSignalType,
				UserID:           &userID,
				Reason:           fmt.Sprintf("insufficient evidence: %d < min_n %d", len(series), win.MinN),
				ObservationIDs:   marshalObservationIDs(observationIDs),
			},
		}
	}

	sort.Slice(series, func(i, j int) bool { return series[i].when.Before(series[j].when) })

	value, err := evalWindowPrimitive(rule.Primitive, series, rule.Params)
	if err != nil {
		return nil, &EmittedSkip{
			Skip: model.DerivationSkip{
				RuleID:           rule.RuleID,
				OutputSignalType: rule.OutputSignalType,
				UserID:           &userID,
				Reason:           err.Error(),
				ObservationIDs:   marshalObservationIDs(observationIDs),
			},
		}
	}

	contribIDs := make([]uuid.UUID, 0, len(series))
	for _, item := range series {
		contribIDs = append(contribIDs, item.id)
	}
	density := math.Min(1.0, float64(len(series))/float64(maxInt(1, win.TargetN)))
	confidence := rule.BaseConfidence * density
	if confidence <= 0 {
		confidence = density
	}
	if confidence <= 0 {
		confidence = 1
	}

	sig := &EmittedSignal{
		Signal: model.Signal{
			SignalType:           rule.OutputSignalType,
			UserID:               userID,
			Value:                mustMarshalJSONB(map[string]any{"value": value}),
			DerivedAt:            derivedAt,
			InferenceMethod:      rule.InferenceMethod,
			DerivedFrom:          marshalObservationIDs(contribIDs),
			RuleID:               rule.RuleID,
			RuleVersion:          defaultString(rule.Version, "1.0.0"),
			DerivationConfidence: confidence,
		},
		ObservationIDs: contribIDs,
	}
	return sig, nil
}

func evalPointPrimitive(primitive string, fields map[string]any, bindings map[string]any, params map[string]any) (any, error) {
	switch primitive {
	case PrimitivePassthrough:
		field := stringBinding(bindings, "value")
		if field == "" {
			field = stringParam(params, "field")
		}
		if field == "" {
			return nil, fmt.Errorf("value binding is required")
		}
		value, ok := observation.GetPath(fields, field)
		if !ok {
			return nil, fmt.Errorf("%s", field)
		}
		return value, nil
	case PrimitiveTimeliness:
		eventPath := stringBinding(bindings, "event_ts")
		refPath := stringBinding(bindings, "ref_ts")
		eventRaw, ok := observation.GetPath(fields, eventPath)
		if !ok {
			return nil, fmt.Errorf("%s", eventPath)
		}
		refRaw, ok := observation.GetPath(fields, refPath)
		if !ok {
			return nil, fmt.Errorf("%s", refPath)
		}
		eventTs, err := asTime(eventRaw)
		if err != nil {
			return nil, err
		}
		refTs, err := asTime(refRaw)
		if err != nil {
			return nil, err
		}
		return refTs.Sub(eventTs).Hours() / 24.0, nil
	case PrimitiveThreshold:
		valuePath := stringBinding(bindings, "value")
		minValue, ok := floatParam(params, "min")
		if !ok {
			return nil, fmt.Errorf("missing threshold min")
		}
		raw, ok := observation.GetPath(fields, valuePath)
		if !ok {
			return nil, fmt.Errorf("%s", valuePath)
		}
		num, err := asFloat(raw)
		if err != nil {
			return nil, err
		}
		return num >= minValue, nil
	default:
		return nil, fmt.Errorf("unsupported point primitive '%s'", primitive)
	}
}

func evalWindowPrimitive(primitive string, series []windowSeriesItem, params map[string]any) (float64, error) {
	switch primitive {
	case PrimitiveCount:
		return float64(len(series)), nil
	case PrimitiveRate:
		days := 1.0
		if v, ok := floatParam(params, "window_days"); ok && v > 0 {
			days = v
		}
		return float64(len(series)) / days, nil
	case PrimitiveMean:
		sum := 0.0
		for _, item := range series {
			sum += item.value
		}
		return sum / float64(len(series)), nil
	case PrimitiveTrend:
		if len(series) < 2 {
			return 0, fmt.Errorf("primitive returned None (e.g. zero variance / <2 points)")
		}
		xs := make([]float64, len(series))
		ys := make([]float64, len(series))
		for i, item := range series {
			xs[i] = float64(item.when.Unix())
			ys[i] = item.value
		}
		meanX := mean(xs)
		meanY := mean(ys)
		denom := 0.0
		num := 0.0
		for i := range xs {
			denom += math.Pow(xs[i]-meanX, 2)
			num += (xs[i] - meanX) * (ys[i] - meanY)
		}
		if denom == 0 {
			return 0, fmt.Errorf("primitive returned None (e.g. zero variance / <2 points)")
		}
		return num / denom, nil
	case PrimitiveDispersion:
		if len(series) < 2 {
			return 0, fmt.Errorf("primitive returned None (e.g. zero variance / <2 points)")
		}
		values := make([]float64, 0, len(series))
		for _, item := range series {
			values = append(values, item.value)
		}
		stddev := populationStdDev(values)
		return 1.0 / (1.0 + stddev), nil
	case PrimitiveComparative:
		meanValue := 0.0
		for _, item := range series {
			meanValue += item.value
		}
		meanValue /= float64(len(series))
		baseMean, ok := floatParam(params, "baseline_mean")
		if !ok {
			return 0, fmt.Errorf("missing baseline_mean")
		}
		baseStd, ok := floatParam(params, "baseline_std")
		if !ok || baseStd == 0 {
			return 0, fmt.Errorf("missing/invalid baseline_std")
		}
		return (meanValue - baseMean) / baseStd, nil
	default:
		return 0, fmt.Errorf("unsupported window primitive '%s'", primitive)
	}
}

func perObservationScalar(fields map[string]any, rule DerivationRuleSpec) (float64, error) {
	if rule.ValueFrom == nil {
		return 1.0, nil
	}
	if rule.ValueFrom.Constant != nil {
		return *rule.ValueFrom.Constant, nil
	}
	if rule.ValueFrom.Field != nil {
		value, ok := observation.GetPath(fields, *rule.ValueFrom.Field)
		if !ok {
			return 0, fmt.Errorf("%s", *rule.ValueFrom.Field)
		}
		return asFloat(value)
	}
	if rule.ValueFrom.Primitive != nil {
		derived, err := evalPointPrimitive(*rule.ValueFrom.Primitive, fields, rule.ValueFrom.Bindings, rule.ValueFrom.Params)
		if err != nil {
			return 0, err
		}
		return asFloat(derived)
	}
	return 0, fmt.Errorf("value_from requires constant, field, or primitive")
}

func filterWindowObservations(observations []model.CanonicalObservation, asOf time.Time, win *WindowSpec) []model.CanonicalObservation {
	filtered := make([]model.CanonicalObservation, 0, len(observations))
	for _, obs := range observations {
		if obs.OccurredAt.After(asOf) {
			continue
		}
		filtered = append(filtered, obs)
	}
	if win != nil && strings.EqualFold(win.Kind, "trailing_days") && win.Days != nil && *win.Days > 0 {
		cutoff := asOf.Add(-time.Duration(*win.Days) * 24 * time.Hour)
		next := make([]model.CanonicalObservation, 0, len(filtered))
		for _, obs := range filtered {
			if obs.OccurredAt.Before(cutoff) {
				continue
			}
			next = append(next, obs)
		}
		filtered = next
	}
	return filtered
}

func matchesObservationType(rule DerivationRuleSpec, observationType string) bool {
	for _, inputType := range rule.InputObservationTypes {
		if strings.TrimSpace(inputType) == observationType {
			return true
		}
	}
	return false
}

func collectObservationIDs(observations []model.CanonicalObservation) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(observations))
	for _, obs := range observations {
		ids = append(ids, obs.ID)
	}
	return ids
}

func decodeFields(raw model.JSONB) (map[string]any, error) {
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func marshalObservationIDs(ids []uuid.UUID) model.JSONB {
	stringIDs := make([]string, 0, len(ids))
	for _, id := range ids {
		stringIDs = append(stringIDs, id.String())
	}
	return mustMarshalJSONB(stringIDs)
}

func mustMarshalJSONB(value any) model.JSONB {
	data, err := json.Marshal(value)
	if err != nil {
		return model.JSONB([]byte("null"))
	}
	return model.JSONB(data)
}

func asTime(value any) (time.Time, error) {
	switch typed := value.(type) {
	case time.Time:
		return typed.UTC(), nil
	case *time.Time:
		if typed == nil {
			return time.Time{}, fmt.Errorf("nil time")
		}
		return typed.UTC(), nil
	default:
		s := strings.TrimSpace(fmt.Sprint(value))
		if s == "" {
			return time.Time{}, fmt.Errorf("empty datetime")
		}
		parsed, err := time.Parse(time.RFC3339, strings.ReplaceAll(s, " ", "T"))
		if err != nil {
			return time.Time{}, err
		}
		return parsed.UTC(), nil
	}
}

func asFloat(value any) (float64, error) {
	switch typed := value.(type) {
	case float64:
		return typed, nil
	case float32:
		return float64(typed), nil
	case int:
		return float64(typed), nil
	case int64:
		return float64(typed), nil
	case int32:
		return float64(typed), nil
	case json.Number:
		return typed.Float64()
	case bool:
		if typed {
			return 1, nil
		}
		return 0, nil
	default:
		return 0, fmt.Errorf("expected number, got %T", value)
	}
}

func stringBinding(bindings map[string]any, key string) string {
	if bindings == nil {
		return ""
	}
	value, ok := bindings[key]
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func stringParam(params map[string]any, key string) string {
	if params == nil {
		return ""
	}
	value, ok := params[key]
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func floatParam(params map[string]any, key string) (float64, bool) {
	if params == nil {
		return 0, false
	}
	value, ok := params[key]
	if !ok {
		return 0, false
	}
	parsed, err := asFloat(value)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, value := range values {
		sum += value
	}
	return sum / float64(len(values))
}

func populationStdDev(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	m := mean(values)
	variance := 0.0
	for _, value := range values {
		variance += math.Pow(value-m, 2)
	}
	variance /= float64(len(values))
	return math.Sqrt(variance)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
