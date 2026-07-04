package observation

import (
	"encoding/json"
	"strings"
)

const (
	QuarantineReasonNoBinding      = "no_binding"
	QuarantineReasonMappingError   = "mapping_error"
	QuarantineReasonMissingEmail   = "missing_email"
	QuarantineReasonUnresolvedUser = "unresolved_person"
	QuarantineReasonInvalidPayload = "invalid_payload"
	QuarantineReasonInvalidBinding = "invalid_binding"
	ResolveStrategyAuto            = "auto"
	ResolveStrategyLookupOnly      = "lookup_only"
	TransformRename                = "rename"
	TransformCast                  = "cast"
	TransformParseDateTime         = "parse_datetime"
	TransformConstant              = "constant"
	TransformHash                  = "hash"
)

type MatchCondition struct {
	SourceEventType string         `json:"source_event_type"`
	PayloadEquals   map[string]any `json:"payload_equals,omitempty"`
}

type FieldMapping struct {
	CanonicalField string         `json:"canonical_field"`
	SourcePath     string         `json:"source_path,omitempty"`
	Transform      string         `json:"transform,omitempty"`
	Params         map[string]any `json:"params,omitempty"`
	Required       bool           `json:"required"`
	Default        any            `json:"default,omitempty"`
}

type EntityResolution struct {
	SubjectSourcePath string `json:"subject_source_path"`
	EmailSourcePath   string `json:"email_source_path,omitempty"`
	Namespace         string `json:"namespace,omitempty"`
	Strategy          string `json:"strategy,omitempty"`
}

type BindingSpec struct {
	BindingID         string           `json:"binding_id,omitempty"`
	Version           string           `json:"version,omitempty"`
	SourceConnector   string           `json:"source_connector,omitempty"`
	Match             MatchCondition   `json:"match"`
	ObservationType   string           `json:"observation_type"`
	IngestionAltitude string           `json:"ingestion_altitude,omitempty"`
	Domain            string           `json:"domain,omitempty"`
	FieldMappings     []FieldMapping   `json:"field_mappings"`
	EntityResolution  EntityResolution `json:"entity_resolution"`
}

func ParseBindingSpec(raw json.RawMessage) (*BindingSpec, error) {
	var spec BindingSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		return nil, err
	}
	spec.EntityResolution.SubjectSourcePath = strings.TrimSpace(spec.EntityResolution.SubjectSourcePath)
	spec.EntityResolution.EmailSourcePath = strings.TrimSpace(spec.EntityResolution.EmailSourcePath)
	spec.EntityResolution.Namespace = strings.TrimSpace(spec.EntityResolution.Namespace)
	spec.EntityResolution.Strategy = strings.TrimSpace(spec.EntityResolution.Strategy)
	if spec.EntityResolution.Strategy == "" {
		spec.EntityResolution.Strategy = ResolveStrategyAuto
	}
	return &spec, nil
}
