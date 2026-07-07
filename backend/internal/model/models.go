package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

type JSONB json.RawMessage

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return json.RawMessage(j).MarshalJSON()
}

func (j *JSONB) UnmarshalJSON(data []byte) error {
	if !json.Valid(data) {
		return errors.New("invalid JSONB value")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return []byte(j), nil
}

func (j *JSONB) Scan(value any) error {
	if value == nil {
		*j = nil
		return nil
	}

	switch data := value.(type) {
	case []byte:
		*j = append((*j)[0:0], data...)
		return nil
	case string:
		*j = append((*j)[0:0], data...)
		return nil
	default:
		return errors.New("unsupported scan type for JSONB")
	}
}

type Institution struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Type      *string   `json:"type,omitempty"`
	Status    string    `gorm:"not null;default:active" json:"status"`
	CreatedAt time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:now()" json:"updated_at"`

	DataSources []DataSource `gorm:"foreignKey:InstitutionID" json:"data_sources,omitempty"`
	RawRecords  []RawRecord  `gorm:"foreignKey:InstitutionID" json:"raw_records,omitempty"`
}

func (Institution) TableName() string {
	return "institutions"
}

// User is the unified identity record for every person in Profiler.
type User struct {
	ID         uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ZitadelSub *string   `gorm:"uniqueIndex"                                    json:"zitadel_sub,omitempty"`
	AuthxSub   *string   `gorm:"uniqueIndex"                                    json:"authx_sub,omitempty"`
	Email      string    `gorm:"not null;uniqueIndex"                           json:"email"`
	Name       string    `gorm:"not null"                                       json:"name"`
	Status     string    `gorm:"not null;default:active"                        json:"status"`
	CreatedAt  time.Time `gorm:"not null;default:now()"                         json:"created_at"`
	UpdatedAt  time.Time `gorm:"not null;default:now()"                         json:"updated_at"`

	Roles      []UserRole     `gorm:"foreignKey:UserID" json:"roles,omitempty"`
	Identities []UserIdentity `gorm:"foreignKey:UserID" json:"identities,omitempty"`
}

func (User) TableName() string { return "users" }

// UserRole assigns a role to a User, optionally scoped to an Institution.
// Platform roles (platform_admin, platform_viewer) have InstitutionID = nil.
// Institution / learner roles have InstitutionID set.
type UserRole struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID        uuid.UUID  `gorm:"type:uuid;not null;index"                        json:"user_id"`
	Role          string     `gorm:"not null"                                        json:"role"`
	InstitutionID *uuid.UUID `gorm:"type:uuid;index"                                 json:"institution_id,omitempty"`
	Status        string     `gorm:"not null;default:active"                         json:"status"`
	CreatedAt     time.Time  `gorm:"not null;default:now()"                          json:"created_at"`
	UpdatedAt     time.Time  `gorm:"not null;default:now()"                          json:"updated_at"`

	User        User         `gorm:"foreignKey:UserID"        json:"user,omitempty"`
	Institution *Institution `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
}

func (UserRole) TableName() string { return "user_roles" }

type ConnectorDefinition struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Slug      string    `gorm:"not null" json:"slug"`
	Type      string    `gorm:"not null" json:"type"`
	Version   string    `gorm:"not null;default:v1" json:"version"`
	CreatedAt time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:now()" json:"updated_at"`

	DataSources []DataSource `gorm:"foreignKey:ConnectorDefinitionID" json:"data_sources,omitempty"`
}

func (ConnectorDefinition) TableName() string {
	return "connector_definitions"
}

type DataSource struct {
	ID                    uuid.UUID            `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID         uuid.UUID            `gorm:"type:uuid;not null;index" json:"institution_id"`
	ConnectorDefinitionID uuid.UUID            `gorm:"type:uuid;not null;index" json:"connector_definition_id"`
	Name                  string               `gorm:"not null" json:"name"`
	Status                string               `gorm:"not null;default:active" json:"status"`
	LastSyncAt            *time.Time           `json:"last_sync_at,omitempty"`
	RawStorageConsentAt   *time.Time           `json:"raw_storage_consent_at,omitempty"`
	RawStorageConsentedBy *string              `json:"raw_storage_consented_by,omitempty"`
	CreatedAt             time.Time            `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt             time.Time            `gorm:"not null;default:now()" json:"updated_at"`
	Institution           *Institution         `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
	ConnectorDefinition   *ConnectorDefinition `gorm:"foreignKey:ConnectorDefinitionID" json:"connector_definition,omitempty"`

	Credentials        *ConnectorCredential `gorm:"foreignKey:DataSourceID" json:"credentials,omitempty"`
	SchemaSnapshots    []SchemaSnapshot     `gorm:"foreignKey:DataSourceID" json:"schema_snapshots,omitempty"`
	Entities           []DataSourceEntity   `gorm:"foreignKey:DataSourceID" json:"entities,omitempty"`
	MappingDefinitions []MappingDefinition  `gorm:"foreignKey:DataSourceID" json:"mapping_definitions,omitempty"`
	SyncJobs           []SyncJob            `gorm:"foreignKey:DataSourceID" json:"sync_jobs,omitempty"`
	RawRecords         []RawRecord          `gorm:"foreignKey:DataSourceID" json:"raw_records,omitempty"`
	Observations       []Observation        `gorm:"foreignKey:DataSourceID" json:"observations,omitempty"`
	UserIdentities     []UserIdentity       `gorm:"foreignKey:DataSourceID" json:"user_identities,omitempty"`
}

func (DataSource) TableName() string {
	return "data_sources"
}

type ConnectorCredential struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	EncryptedPayload JSONB      `gorm:"type:jsonb;not null" json:"encrypted_payload"`
	CreatedAt        time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt        time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	DataSource       DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (ConnectorCredential) TableName() string {
	return "connector_credentials"
}

type SchemaSnapshot struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	Version      int        `gorm:"not null" json:"version"`
	SchemaJSON   JSONB      `gorm:"type:jsonb;not null" json:"schema_json"`
	CreatedAt    time.Time  `gorm:"not null;default:now()" json:"created_at"`
	DataSource   DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (SchemaSnapshot) TableName() string {
	return "schema_snapshots"
}

type DataSourceEntity struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	SourceName   string     `gorm:"not null" json:"source_name"`
	SourceType   string     `gorm:"not null" json:"source_type"`
	TargetDomain *string    `json:"target_domain,omitempty"`
	CreatedAt    time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	DataSource   DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (DataSourceEntity) TableName() string {
	return "data_source_entities"
}

type MappingDefinition struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	TargetDomain string     `gorm:"not null" json:"target_domain"`
	MappingJSON  JSONB      `gorm:"type:jsonb;not null" json:"mapping_json"`
	Approved     bool       `gorm:"not null;default:false" json:"approved"`
	CreatedAt    time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	DataSource   DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (MappingDefinition) TableName() string {
	return "mapping_definitions"
}

type SyncJob struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	Status           string     `gorm:"not null" json:"status"`
	RecordsProcessed int        `gorm:"not null;default:0" json:"records_processed"`
	RecordsFailed    int        `gorm:"not null;default:0" json:"records_failed"`
	StartedAt        *time.Time `json:"started_at,omitempty"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	ErrorMessage     *string    `json:"error_message,omitempty"`
	CreatedAt        time.Time  `gorm:"not null;default:now()" json:"created_at"`
	DataSource       DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`

	RawRecords []RawRecord `gorm:"foreignKey:SyncJobID" json:"raw_records,omitempty"`
}

func (SyncJob) TableName() string {
	return "sync_jobs"
}

type RawRecord struct {
	ID            uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID uuid.UUID  `gorm:"type:uuid;not null;index" json:"institution_id"`
	DataSourceID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	SyncJobID     *uuid.UUID `gorm:"type:uuid;index" json:"sync_job_id,omitempty"`
	EntityType    string     `gorm:"not null" json:"entity_type"`
	ExternalID    *string    `json:"external_id,omitempty"`
	Payload       JSONB      `gorm:"type:jsonb;not null" json:"payload"`
	CreatedAt     time.Time  `gorm:"not null;default:now()" json:"created_at"`

	Institution Institution `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
	DataSource  DataSource  `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
	SyncJob     *SyncJob    `gorm:"foreignKey:SyncJobID" json:"sync_job,omitempty"`
}

func (RawRecord) TableName() string {
	return "raw_records"
}

// Observation stores a parsed webhook observation envelope (Stage 1 dump).
// Webhook ingest writes here directly; Postgres sync uses raw_records instead.
type Observation struct {
	ID                uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DataSourceID      uuid.UUID `gorm:"type:uuid;not null;index" json:"data_source_id"`
	SourceID          string    `gorm:"not null" json:"source_id"`
	IdempotencyKey    string    `gorm:"not null" json:"idempotency_key"`
	SourceConnector   string    `gorm:"not null" json:"source_connector"`
	SourceEventType   string    `gorm:"not null" json:"source_event_type"`
	IngestionAltitude string    `gorm:"not null" json:"ingestion_altitude"`
	OccurredAt        time.Time `gorm:"not null" json:"occurred_at"`
	ReceivedAt        time.Time `gorm:"not null" json:"received_at"`
	Payload           JSONB     `gorm:"type:jsonb;not null" json:"payload"`
	PayloadSchema     JSONB     `gorm:"type:jsonb" json:"payload_schema,omitempty"`
	Description       *string   `json:"description,omitempty"`
	Attestation       JSONB     `gorm:"type:jsonb" json:"attestation,omitempty"`
	// Filled later by binding/canonicalization pipeline; null until then.
	Status           string    `gorm:"not null;default:received" json:"status"`
	ObservationType  *string   `json:"observation_type,omitempty"`
	Domain           *string   `json:"domain,omitempty"`
	BindingID        *string   `json:"binding_id,omitempty"`
	BindingVersion   *string   `json:"binding_version,omitempty"`
	QuarantineReason *string   `json:"quarantine_reason,omitempty"`
	ShapeSignature   *string   `json:"shape_signature,omitempty"`
	CreatedAt        time.Time `gorm:"not null;default:now()" json:"created_at"`

	DataSource DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

const (
	ObservationStatusReceived      = "received"
	ObservationStatusProcessing    = "processing"
	ObservationStatusCanonicalized = "canonicalized"
	ObservationStatusQuarantined   = "quarantined"
)

func (Observation) TableName() string {
	return "observations"
}

type UserIdentity struct {
	ID           uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	DataSourceID uuid.UUID `gorm:"type:uuid;not null;index" json:"data_source_id"`
	ExternalID   string    `gorm:"not null" json:"external_id"`
	Namespace    *string   `json:"namespace,omitempty"`
	CreatedAt    time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt    time.Time `gorm:"not null;default:now()" json:"updated_at"`

	User       User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	DataSource DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (UserIdentity) TableName() string {
	return "user_identities"
}

type ObservationTypeRegistry struct {
	ObservationType string    `gorm:"primaryKey" json:"observation_type"`
	Version         string    `gorm:"not null;default:1.0.0" json:"version"`
	Fields          JSONB     `gorm:"type:jsonb;not null" json:"fields"`
	CreatedAt       time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt       time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (ObservationTypeRegistry) TableName() string {
	return "observation_type_registry"
}

type BindingRegistry struct {
	ID                   uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	BindingID            string    `gorm:"not null;uniqueIndex" json:"binding_id"`
	SourceConnector      string    `gorm:"not null;index" json:"source_connector"`
	SourceEventType      string    `gorm:"not null;index" json:"source_event_type"`
	ObservationType      string    `gorm:"not null" json:"observation_type"`
	Spec                 JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	Status               string    `gorm:"not null;default:candidate;index" json:"status"`
	Version              int       `gorm:"not null;default:1" json:"version"`
	ProposedBy           *string   `json:"proposed_by,omitempty"`
	SampleObservationIDs JSONB     `gorm:"type:jsonb" json:"sample_observation_ids,omitempty"`
	CreatedAt            time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt            time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

const (
	BindingStatusCandidate  = "candidate"
	BindingStatusApproved   = "approved"
	BindingStatusDeprecated = "deprecated"
)

func (BindingRegistry) TableName() string {
	return "binding_registry"
}

type CanonicalObservation struct {
	ID               uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RawObservationID uuid.UUID `gorm:"type:uuid;not null;index" json:"raw_observation_id"`
	ObservationType  string    `gorm:"not null;index" json:"observation_type"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Fields           JSONB     `gorm:"type:jsonb;not null" json:"fields"`
	BindingID        string    `gorm:"not null" json:"binding_id"`
	BindingVersion   int       `gorm:"not null;default:1" json:"binding_version"`
	OccurredAt       time.Time `gorm:"not null" json:"occurred_at"`
	CreatedAt        time.Time `gorm:"not null;default:now()" json:"created_at"`

	RawObservation Observation `gorm:"foreignKey:RawObservationID" json:"raw_observation,omitempty"`
	User           User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (CanonicalObservation) TableName() string {
	return "canonical_observations"
}

type SignalTypeRegistry struct {
	SignalType string    `gorm:"primaryKey" json:"signal_type"`
	Version    string    `gorm:"not null;default:1.0.0" json:"version"`
	Spec       JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt  time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt  time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (SignalTypeRegistry) TableName() string {
	return "signal_type_registry"
}

type DerivationRuleRegistry struct {
	RuleID           string    `gorm:"primaryKey" json:"rule_id"`
	Version          string    `gorm:"not null;default:1.0.0" json:"version"`
	Primitive        string    `gorm:"not null" json:"primitive"`
	OutputSignalType string    `gorm:"not null" json:"output_signal_type"`
	Status           string    `gorm:"not null;default:candidate;index" json:"status"`
	Spec             JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt        time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt        time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

const (
	DerivationRuleStatusCandidate  = "candidate"
	DerivationRuleStatusApproved   = "approved"
	DerivationRuleStatusDeprecated = "deprecated"
)

func (DerivationRuleRegistry) TableName() string {
	return "derivation_rule_registry"
}

type DerivationRun struct {
	ID        uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	AsOf      time.Time  `gorm:"not null;index" json:"as_of"`
	UserID    *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	NSignals  int        `gorm:"not null;default:0" json:"n_signals"`
	NSkips    int        `gorm:"not null;default:0" json:"n_skips"`
	Notes     *string    `json:"notes,omitempty"`
	CreatedAt time.Time  `gorm:"not null;default:now()" json:"created_at"`
}

func (DerivationRun) TableName() string {
	return "derivation_runs"
}

type Signal struct {
	ID                   uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RunID                uuid.UUID `gorm:"type:uuid;not null;index" json:"run_id"`
	SignalType           string    `gorm:"not null;index" json:"signal_type"`
	UserID               uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Value                JSONB     `gorm:"type:jsonb;not null" json:"value"`
	Domain               *string   `gorm:"index" json:"domain,omitempty"`
	DerivedAt            time.Time `gorm:"not null;index" json:"derived_at"`
	InferenceMethod      string    `gorm:"not null;default:rule" json:"inference_method"`
	DerivedFrom          JSONB     `gorm:"type:jsonb;not null" json:"derived_from"`
	RuleID               string    `gorm:"not null;index" json:"rule_id"`
	RuleVersion          string    `gorm:"not null;default:1.0.0" json:"rule_version"`
	DerivationConfidence float64   `gorm:"not null;default:1" json:"derivation_confidence"`
	CreatedAt            time.Time `gorm:"not null;default:now()" json:"created_at"`
}

func (Signal) TableName() string {
	return "signals"
}

type DerivationSkip struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RunID            uuid.UUID  `gorm:"type:uuid;not null;index" json:"run_id"`
	RuleID           string     `gorm:"not null;index" json:"rule_id"`
	OutputSignalType string     `gorm:"not null;index" json:"output_signal_type"`
	UserID           *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Reason           string     `gorm:"not null" json:"reason"`
	ObservationIDs   JSONB      `gorm:"type:jsonb;not null" json:"observation_ids"`
	CreatedAt        time.Time  `gorm:"not null;default:now()" json:"created_at"`
}

func (DerivationSkip) TableName() string {
	return "derivation_skips"
}

type SignalObservation struct {
	ID                     uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	SignalID               uuid.UUID `gorm:"type:uuid;not null;index" json:"signal_id"`
	CanonicalObservationID uuid.UUID `gorm:"type:uuid;not null;index" json:"canonical_observation_id"`
	RuleID                 string    `gorm:"index" json:"rule_id"`
	CreatedAt              time.Time `gorm:"not null;default:now()" json:"created_at"`
}

func (SignalObservation) TableName() string {
	return "signal_observations"
}

type ConstructClaimRegistry struct {
	ClaimID    string    `gorm:"primaryKey" json:"claim_id"`
	Version    string    `gorm:"not null;default:1.0.0" json:"version"`
	SignalType string    `gorm:"not null;index" json:"signal_type"`
	Trait      string    `gorm:"not null;index" json:"trait"`
	Spec       JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt  time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt  time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (ConstructClaimRegistry) TableName() string {
	return "construct_claim_registry"
}

type ConstructRegister struct {
	ConstructID string    `gorm:"primaryKey" json:"construct_id"`
	Trait       string    `gorm:"not null;index" json:"trait"`
	Family      string    `gorm:"not null" json:"family"`
	Version     string    `gorm:"not null;default:0.1.0" json:"version"`
	Spec        JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt   time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (ConstructRegister) TableName() string {
	return "construct_register"
}

type MetricNorm struct {
	SignalType string    `gorm:"primaryKey" json:"signal_type"`
	Spec       JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt  time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt  time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (MetricNorm) TableName() string {
	return "metric_norm"
}

type RewardSystem struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Version   string    `gorm:"not null;default:0.1.0" json:"version"`
	Label     *string   `json:"label,omitempty"`
	Spec      JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:now()" json:"updated_at"`
}

func (RewardSystem) TableName() string {
	return "reward_system"
}

type Job struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Title          string     `gorm:"not null" json:"title"`
	RewardSystemID string     `gorm:"not null;index" json:"reward_system_id"`
	CreatedBy      *uuid.UUID `gorm:"type:uuid;index" json:"created_by,omitempty"`
	Status         string     `gorm:"not null;default:active;index" json:"status"`
	CreatedAt      time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"not null;default:now()" json:"updated_at"`
}

func (Job) TableName() string {
	return "jobs"
}

type MetricRun struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	DerivationRunID *uuid.UUID `gorm:"type:uuid;index" json:"derivation_run_id,omitempty"`
	AsOf            time.Time  `gorm:"not null;index" json:"as_of"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	NEstimates      int        `gorm:"not null;default:0" json:"n_estimates"`
	NScores         int        `gorm:"not null;default:0" json:"n_scores"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedAt       time.Time  `gorm:"not null;default:now()" json:"created_at"`
}

func (MetricRun) TableName() string {
	return "metric_runs"
}

type ConstructEstimate struct {
	ID         uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RunID      uuid.UUID `gorm:"type:uuid;not null;index" json:"run_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Trait      string    `gorm:"not null;index" json:"trait"`
	Value      float64   `gorm:"not null" json:"value"`
	CILower    float64   `gorm:"not null" json:"ci_lower"`
	CIUpper    float64   `gorm:"not null" json:"ci_upper"`
	NEffective float64   `gorm:"not null" json:"n_effective"`
	Spec       JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	CreatedAt  time.Time `gorm:"not null;default:now()" json:"created_at"`
}

func (ConstructEstimate) TableName() string {
	return "construct_estimates"
}

type RewardScore struct {
	ID             uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RunID          uuid.UUID `gorm:"type:uuid;not null;index" json:"run_id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	RewardSystemID string    `gorm:"not null;index" json:"reward_system_id"`
	Score          float64   `gorm:"not null" json:"score"`
	CILower        float64   `gorm:"not null" json:"ci_lower"`
	CIUpper        float64   `gorm:"not null" json:"ci_upper"`
	Spec           JSONB     `gorm:"type:jsonb;not null" json:"spec"`
	Readings       JSONB     `gorm:"type:jsonb;not null" json:"readings"`
	CreatedAt      time.Time `gorm:"not null;default:now()" json:"created_at"`
}

func (RewardScore) TableName() string {
	return "reward_scores"
}
