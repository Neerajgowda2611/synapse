package metric

import (
	"time"

	"github.com/google/uuid"
)

type ValidationStatus string

const (
	ValidationStatusCandidate  ValidationStatus = "candidate"
	ValidationStatusValidated  ValidationStatus = "validated"
	ValidationStatusSurfaced   ValidationStatus = "surfaced"
	ValidationStatusDeprecated ValidationStatus = "deprecated"
)

type NormSpec struct {
	Kind string  `json:"kind"`
	Lo   float64 `json:"lo"`
	Hi   float64 `json:"hi"`
}

type ConfidenceInterval struct {
	Point float64 `json:"point"`
	Lower float64 `json:"lower"`
	Upper float64 `json:"upper"`
	Level float64 `json:"level"`
}

type EvidenceDensity struct {
	NSignals            int     `json:"n_signals"`
	NEffective          float64 `json:"n_effective"`
	DistinctSignalTypes int     `json:"distinct_signal_types"`
	NObservations       int     `json:"n_observations"`
}

type ConstructEstimate struct {
	UserID             uuid.UUID          `json:"user_id"`
	Trait              string             `json:"trait"`
	Value              float64            `json:"value"`
	Confidence         ConfidenceInterval `json:"confidence"`
	Evidence           EvidenceDensity    `json:"evidence"`
	MostRecentSignalAt *time.Time         `json:"most_recent_signal_at,omitempty"`
	DerivedFrom        []uuid.UUID        `json:"derived_from"`
}

type ValidityEvidence struct {
	Criterion        *string  `json:"criterion,omitempty"`
	N                int      `json:"n"`
	ConvergentR      *float64 `json:"convergent_r,omitempty"`
	DiscriminantMaxR *float64 `json:"discriminant_max_r,omitempty"`
	InvarianceLevel  *string  `json:"invariance_level,omitempty"`
	InvarianceScope  []string `json:"invariance_scope"`
	DIFChecked       bool     `json:"dif_checked"`
	DIFFlags         []string `json:"dif_flags"`
	Gameability      string   `json:"gameability"`
}

type ConstructClaim struct {
	ClaimID    string           `json:"claim_id"`
	Version    string           `json:"version"`
	SignalType string           `json:"signal_type"`
	Trait      string           `json:"trait"`
	Family     string           `json:"family"`
	Direction  string           `json:"direction"`
	Pole       *string          `json:"pole,omitempty"`
	Scope      []string         `json:"scope"`
	Source     string           `json:"source"`
	AuthoredBy string           `json:"authored_by"`
	Evidence   ValidityEvidence `json:"evidence"`
}

type ClaimRegistry struct {
	Claims map[string]ConstructClaim `json:"claims"`
}

type FairnessStatus struct {
	DIFChecked     bool     `json:"dif_checked"`
	DIFFlags       []string `json:"dif_flags"`
	KnownConfounds []string `json:"known_confounds"`
}

type ConstructRegisterEntry struct {
	ConstructID         string         `json:"construct_id"`
	Trait               string         `json:"trait"`
	Family              string         `json:"family"`
	Shape               string         `json:"shape"`
	Peak                *float64       `json:"peak,omitempty"`
	Pole                *string        `json:"pole,omitempty"`
	Name                string         `json:"name"`
	Definition          string         `json:"definition"`
	ScientificRationale string         `json:"scientific_rationale"`
	LegitimacyRationale string         `json:"legitimacy_rationale"`
	SupportingSignals   []string       `json:"supporting_signals"`
	RequiredObservs     []string       `json:"required_observations"`
	SourceApps          []string       `json:"source_apps"`
	Fairness            FairnessStatus `json:"fairness"`
	UncertaintyPolicy   string         `json:"uncertainty_policy"`
	Version             string         `json:"version"`
}

type ConstructRegister struct {
	Entries map[string]ConstructRegisterEntry
}

type GateCheck struct {
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Detail string `json:"detail"`
}

type GateReport struct {
	ConstructID string      `json:"construct_id"`
	Checks      []GateCheck `json:"checks"`
}

func (r GateReport) Surfaceable() bool {
	for _, check := range r.Checks {
		if !check.Passed {
			return false
		}
	}
	return true
}

type MetricKind string

const (
	MetricKindReflective MetricKind = "reflective"
	MetricKindFormative  MetricKind = "formative"
)

type MetricShape string

const (
	MetricShapeMonotonic MetricShape = "monotonic"
	MetricShapeBipolar   MetricShape = "bipolar"
	MetricShapePeaked    MetricShape = "peaked"
)

type MetricDefinition struct {
	MetricID   string             `json:"metric_id"`
	Kind       MetricKind         `json:"kind"`
	Trait      *string            `json:"trait,omitempty"`
	Components map[string]float64 `json:"components"`
	Shape      MetricShape        `json:"shape"`
	Peak       *float64           `json:"peak,omitempty"`
	Pole       *string            `json:"pole,omitempty"`
}

type RewardSystem struct {
	ID            string             `json:"id"`
	Metrics       []MetricDefinition `json:"metrics"`
	MetricWeights map[string]float64 `json:"metric_weights"`
	Label         string             `json:"label"`
	Owner         string             `json:"owner"`
	Version       string             `json:"version"`
}

type MetricReading struct {
	MetricID   string             `json:"metric_id"`
	Kind       MetricKind         `json:"kind"`
	Value      float64            `json:"value"`
	Confidence ConfidenceInterval `json:"confidence"`
	Usable     bool               `json:"usable"`
	Components map[string]float64 `json:"components"`
	Missing    []string           `json:"missing"`
}

type RewardScore struct {
	RewardSystemID string             `json:"reward_system_id"`
	UserID         uuid.UUID          `json:"user_id"`
	Score          float64            `json:"score"`
	RawScore       float64            `json:"raw_score"`
	WeightSum      float64            `json:"weight_sum"`
	Confidence     ConfidenceInterval `json:"confidence"`
	MetricValues   map[string]float64 `json:"metric_values"`
	Suppressed     []string           `json:"suppressed"`
}

type ScoringSignal struct {
	ID                   uuid.UUID
	SignalType           string
	UserID               uuid.UUID
	Value                float64
	DerivedAt            time.Time
	DerivationConfidence float64
	DerivedFrom          []uuid.UUID
}
