package webhook

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// ObservationEnvelope is the required request body for webhook ingest.
// Apps wrap their native event data inside Payload and keep all other fields
// at the envelope level. Profiler stores the envelope metadata as first-class
// columns and the inner Payload verbatim.
type ObservationEnvelope struct {
	SourceID          string          `json:"source_id"`
	IdempotencyKey    string          `json:"idempotency_key"`
	SourceConnector   string          `json:"source_connector"`
	SourceEventType   string          `json:"source_event_type"`
	IngestionAltitude string          `json:"ingestion_altitude"`
	OccurredAt        time.Time       `json:"occurred_at"`
	Payload           json.RawMessage `json:"payload"`
	PayloadSchema     json.RawMessage `json:"payload_schema,omitempty"`
	Description       *string         `json:"description,omitempty"`
	Attestation       json.RawMessage `json:"attestation,omitempty"`
}

var (
	ErrMissingSourceID          = errors.New("source_id is required")
	ErrMissingIdempotencyKey    = errors.New("idempotency_key is required")
	ErrMissingSourceConnector   = errors.New("source_connector is required")
	ErrMissingSourceEventType   = errors.New("source_event_type is required")
	ErrMissingIngestionAltitude = errors.New("ingestion_altitude is required")
	ErrMissingOccurredAt        = errors.New("occurred_at is required")
	ErrMissingPayload           = errors.New("payload is required")
	ErrPayloadMustBeObject       = errors.New("payload must be a JSON object")
	ErrPayloadSchemaMustBeObject = errors.New("payload_schema must be a JSON object")
	ErrSignalNotSupported       = errors.New("ingestion_altitude 'signal' is not supported yet; use 'observation'")
	ErrInvalidIngestionAltitude = errors.New("ingestion_altitude must be 'observation'")
)

// IsEnvelopeValidationError returns true when err is one of the known envelope
// validation sentinels. Handlers use this to distinguish 400 from 500 errors.
func IsEnvelopeValidationError(err error) bool {
	return errors.Is(err, ErrMissingSourceID) ||
		errors.Is(err, ErrMissingIdempotencyKey) ||
		errors.Is(err, ErrMissingSourceConnector) ||
		errors.Is(err, ErrMissingSourceEventType) ||
		errors.Is(err, ErrMissingIngestionAltitude) ||
		errors.Is(err, ErrMissingOccurredAt) ||
		errors.Is(err, ErrMissingPayload) ||
		errors.Is(err, ErrPayloadMustBeObject) ||
		errors.Is(err, ErrPayloadSchemaMustBeObject) ||
		errors.Is(err, ErrSignalNotSupported) ||
		errors.Is(err, ErrInvalidIngestionAltitude)
}

// Validate checks all required fields, ensures payload is a JSON object,
// and rejects unsupported altitude values. Trims whitespace on string fields.
func (e *ObservationEnvelope) Validate() error {
	e.SourceID = strings.TrimSpace(e.SourceID)
	e.IdempotencyKey = strings.TrimSpace(e.IdempotencyKey)
	e.SourceConnector = strings.TrimSpace(e.SourceConnector)
	e.SourceEventType = strings.TrimSpace(e.SourceEventType)
	e.IngestionAltitude = strings.TrimSpace(e.IngestionAltitude)

	if e.SourceID == "" {
		return ErrMissingSourceID
	}
	if e.IdempotencyKey == "" {
		return ErrMissingIdempotencyKey
	}
	if e.SourceConnector == "" {
		return ErrMissingSourceConnector
	}
	if e.SourceEventType == "" {
		return ErrMissingSourceEventType
	}
	if e.IngestionAltitude == "" {
		return ErrMissingIngestionAltitude
	}
	if e.IngestionAltitude == "signal" {
		return ErrSignalNotSupported
	}
	if e.IngestionAltitude != "observation" {
		return ErrInvalidIngestionAltitude
	}
	if e.OccurredAt.IsZero() {
		return ErrMissingOccurredAt
	}
	if len(e.Payload) == 0 {
		return ErrMissingPayload
	}

	// Ensure payload is a JSON object, not an array or scalar
	var probe map[string]any
	if err := json.Unmarshal(e.Payload, &probe); err != nil {
		return ErrPayloadMustBeObject
	}
	if probe == nil {
		return ErrPayloadMustBeObject
	}

	if len(e.PayloadSchema) > 0 {
		var schemaProbe map[string]any
		if err := json.Unmarshal(e.PayloadSchema, &schemaProbe); err != nil {
			return ErrPayloadSchemaMustBeObject
		}
		if schemaProbe == nil {
			return ErrPayloadSchemaMustBeObject
		}
	}

	return nil
}
