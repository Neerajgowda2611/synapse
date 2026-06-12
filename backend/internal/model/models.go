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

	Users       []InstitutionUser `gorm:"foreignKey:InstitutionID" json:"users,omitempty"`
	DataSources []DataSource      `gorm:"foreignKey:InstitutionID" json:"data_sources,omitempty"`
	Learners    []Learner         `gorm:"foreignKey:InstitutionID" json:"learners,omitempty"`
	RawRecords  []RawRecord       `gorm:"foreignKey:InstitutionID" json:"raw_records,omitempty"`
}

func (Institution) TableName() string {
	return "institutions"
}

type InstitutionUser struct {
	ID            uuid.UUID   `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID uuid.UUID   `gorm:"type:uuid;not null;index" json:"institution_id"`
	Name          string      `gorm:"not null" json:"name"`
	Email         string      `gorm:"not null" json:"email"`
	Role          string      `gorm:"not null" json:"role"`
	Status        string      `gorm:"not null;default:active" json:"status"`
	CreatedAt     time.Time   `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt     time.Time   `gorm:"not null;default:now()" json:"updated_at"`
	Institution   Institution `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
}

func (InstitutionUser) TableName() string {
	return "institution_users"
}

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
	ID                    uuid.UUID           `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID         uuid.UUID           `gorm:"type:uuid;not null;index" json:"institution_id"`
	ConnectorDefinitionID uuid.UUID           `gorm:"type:uuid;not null;index" json:"connector_definition_id"`
	Name                  string              `gorm:"not null" json:"name"`
	Status                string              `gorm:"not null;default:active" json:"status"`
	LastSyncAt            *time.Time          `json:"last_sync_at,omitempty"`
	CreatedAt             time.Time           `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt             time.Time           `gorm:"not null;default:now()" json:"updated_at"`
	Institution           *Institution         `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
	ConnectorDefinition   *ConnectorDefinition `gorm:"foreignKey:ConnectorDefinitionID" json:"connector_definition,omitempty"`

	Credentials        *ConnectorCredential `gorm:"foreignKey:DataSourceID" json:"credentials,omitempty"`
	SchemaSnapshots    []SchemaSnapshot     `gorm:"foreignKey:DataSourceID" json:"schema_snapshots,omitempty"`
	Entities           []DataSourceEntity   `gorm:"foreignKey:DataSourceID" json:"entities,omitempty"`
	MappingDefinitions []MappingDefinition  `gorm:"foreignKey:DataSourceID" json:"mapping_definitions,omitempty"`
	SyncJobs           []SyncJob            `gorm:"foreignKey:DataSourceID" json:"sync_jobs,omitempty"`
	RawRecords         []RawRecord          `gorm:"foreignKey:DataSourceID" json:"raw_records,omitempty"`
	LearnerIdentities  []LearnerIdentity    `gorm:"foreignKey:DataSourceID" json:"learner_identities,omitempty"`
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
	ID            uuid.UUID   `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID uuid.UUID   `gorm:"type:uuid;not null;index" json:"institution_id"`
	DataSourceID  uuid.UUID   `gorm:"type:uuid;not null;index" json:"data_source_id"`
	SyncJobID     *uuid.UUID  `gorm:"type:uuid;index" json:"sync_job_id,omitempty"`
	EntityType    string      `gorm:"not null" json:"entity_type"`
	ExternalID    *string     `json:"external_id,omitempty"`
	Payload       JSONB       `gorm:"type:jsonb;not null" json:"payload"`
	CreatedAt     time.Time   `gorm:"not null;default:now()" json:"created_at"`
	Institution   Institution `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
	DataSource    DataSource  `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
	SyncJob       *SyncJob    `gorm:"foreignKey:SyncJobID" json:"sync_job,omitempty"`
}

func (RawRecord) TableName() string {
	return "raw_records"
}

type Learner struct {
	ID                 uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	InstitutionID      uuid.UUID `gorm:"type:uuid;not null;index" json:"institution_id"`
	CanonicalLearnerID *string   `json:"canonical_learner_id,omitempty"`
	Status             string    `gorm:"not null;default:active" json:"status"`
	CreatedAt          time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt          time.Time `gorm:"not null;default:now()" json:"updated_at"`
	Institution        Institution

	Identities        []LearnerIdentity         `gorm:"foreignKey:LearnerID" json:"identities,omitempty"`
	Profile           *LearnerProfile           `gorm:"foreignKey:LearnerID" json:"profile,omitempty"`
	Education         []LearnerEducation        `gorm:"foreignKey:LearnerID" json:"education,omitempty"`
	AttendanceRecords []LearnerAttendanceRecord `gorm:"foreignKey:LearnerID" json:"attendance_records,omitempty"`
	Assessments       []LearnerAssessment       `gorm:"foreignKey:LearnerID" json:"assessments,omitempty"`
	Payments          []LearnerPayment          `gorm:"foreignKey:LearnerID" json:"payments,omitempty"`
	Skills            []LearnerSkill            `gorm:"foreignKey:LearnerID" json:"skills,omitempty"`
	Certifications    []LearnerCertification    `gorm:"foreignKey:LearnerID" json:"certifications,omitempty"`
	Projects          []LearnerProject          `gorm:"foreignKey:LearnerID" json:"projects,omitempty"`
	Placements        []LearnerPlacement        `gorm:"foreignKey:LearnerID" json:"placements,omitempty"`
}

func (Learner) TableName() string {
	return "learners"
}

type LearnerIdentity struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	DataSourceID uuid.UUID  `gorm:"type:uuid;not null;index" json:"data_source_id"`
	ExternalID   string     `gorm:"not null" json:"external_id"`
	ExternalType *string    `json:"external_type,omitempty"`
	CreatedAt    time.Time  `gorm:"not null;default:now()" json:"created_at"`
	Learner      Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
	DataSource   DataSource `gorm:"foreignKey:DataSourceID" json:"data_source,omitempty"`
}

func (LearnerIdentity) TableName() string {
	return "learner_identities"
}

type LearnerProfile struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	FullName        *string    `json:"full_name,omitempty"`
	FirstName       *string    `json:"first_name,omitempty"`
	LastName        *string    `json:"last_name,omitempty"`
	Email           *string    `json:"email,omitempty"`
	Phone           *string    `json:"phone,omitempty"`
	Gender          *string    `json:"gender,omitempty"`
	DateOfBirth     *time.Time `json:"date_of_birth,omitempty"`
	Nationality     *string    `json:"nationality,omitempty"`
	ProfilePhotoURL *string    `json:"profile_photo_url,omitempty"`
	CreatedAt       time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner         Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerProfile) TableName() string {
	return "learner_profiles"
}

type LearnerEducation struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	Program        *string    `json:"program,omitempty"`
	Degree         *string    `json:"degree,omitempty"`
	Specialization *string    `json:"specialization,omitempty"`
	Department     *string    `json:"department,omitempty"`
	Batch          *string    `json:"batch,omitempty"`
	CurrentYear    *int       `json:"current_year,omitempty"`
	RollNumber     *string    `json:"roll_number,omitempty"`
	AdmissionDate  *time.Time `json:"admission_date,omitempty"`
	GraduationDate *time.Time `json:"graduation_date,omitempty"`
	CGPA           *float64   `json:"cgpa,omitempty"`
	AcademicStatus *string    `json:"academic_status,omitempty"`
	CreatedAt      time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner        Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerEducation) TableName() string {
	return "learner_education"
}

type LearnerAttendanceRecord struct {
	ID                   uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID            uuid.UUID `gorm:"type:uuid;not null;index" json:"learner_id"`
	AttendancePercentage *float64  `json:"attendance_percentage,omitempty"`
	ClassesAttended      *int      `json:"classes_attended,omitempty"`
	ClassesConducted     *int      `json:"classes_conducted,omitempty"`
	AttendanceDate       time.Time `gorm:"not null" json:"attendance_date"`
	CreatedAt            time.Time `gorm:"not null;default:now()" json:"created_at"`
	Learner              Learner   `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerAttendanceRecord) TableName() string {
	return "learner_attendance_records"
}

type LearnerAssessment struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	AssessmentName *string    `json:"assessment_name,omitempty"`
	AssessmentType *string    `json:"assessment_type,omitempty"`
	Score          *float64   `json:"score,omitempty"`
	MaxScore       *float64   `json:"max_score,omitempty"`
	Percentage     *float64   `json:"percentage,omitempty"`
	AttemptDate    *time.Time `json:"attempt_date,omitempty"`
	Status         *string    `json:"status,omitempty"`
	CreatedAt      time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner        Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerAssessment) TableName() string {
	return "learner_assessments"
}

type LearnerPayment struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	PaymentType *string    `json:"payment_type,omitempty"`
	Amount      *float64   `json:"amount,omitempty"`
	Currency    *string    `json:"currency,omitempty"`
	Status      *string    `json:"status,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	PaymentDate *time.Time `json:"payment_date,omitempty"`
	CreatedAt   time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner     Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerPayment) TableName() string {
	return "learner_payments"
}

type LearnerSkill struct {
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID   uuid.UUID `gorm:"type:uuid;not null;index" json:"learner_id"`
	SkillName   *string   `json:"skill_name,omitempty"`
	Category    *string   `json:"category,omitempty"`
	Proficiency *string   `json:"proficiency,omitempty"`
	CreatedAt   time.Time `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"not null;default:now()" json:"updated_at"`
	Learner     Learner   `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerSkill) TableName() string {
	return "learner_skills"
}

type LearnerCertification struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	CertificateName *string    `json:"certificate_name,omitempty"`
	Issuer          *string    `json:"issuer,omitempty"`
	IssuedDate      *time.Time `json:"issued_date,omitempty"`
	ExpiryDate      *time.Time `json:"expiry_date,omitempty"`
	CertificateURL  *string    `json:"certificate_url,omitempty"`
	CreatedAt       time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner         Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerCertification) TableName() string {
	return "learner_certifications"
}

type LearnerProject struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	ProjectName *string    `json:"project_name,omitempty"`
	Description *string    `json:"description,omitempty"`
	Role        *string    `json:"role,omitempty"`
	TechStack   JSONB      `gorm:"type:jsonb" json:"tech_stack,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	CreatedAt   time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner     Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerProject) TableName() string {
	return "learner_projects"
}

type LearnerPlacement struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	LearnerID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"learner_id"`
	PlacementStatus *string    `json:"placement_status,omitempty"`
	CompanyName     *string    `json:"company_name,omitempty"`
	JobRole         *string    `json:"job_role,omitempty"`
	Package         *float64   `json:"package,omitempty"`
	JoiningDate     *time.Time `json:"joining_date,omitempty"`
	CreatedAt       time.Time  `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"not null;default:now()" json:"updated_at"`
	Learner         Learner    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

func (LearnerPlacement) TableName() string {
	return "learner_placements"
}
