package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/auth"
	"github.com/profiler/backend/internal/connector"
	connectorpostgres "github.com/profiler/backend/internal/connector/postgres"
	connectorwebhook "github.com/profiler/backend/internal/connector/webhook"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

var (
	ErrDataSourceNotFound           = errors.New("data source not found")
	ErrInvalidDataSource            = errors.New("invalid data source input")
	ErrConnectorDefinitionNotFound  = errors.New("connector definition not found")
	ErrConnectorCredentialsNotFound = errors.New("connector credentials not found")
	ErrInvalidConnectorCredentials  = errors.New("invalid connector credentials")
	ErrDataSourceAccessDenied       = errors.New("data source access denied")
	ErrSchemaSnapshotNotFound       = errors.New("schema snapshot not found")
	ErrInvalidWebhookPayload        = errors.New("invalid webhook payload")
	ErrWebhookNotFound              = errors.New("webhook not found")
)

type CreateDataSourceInput struct {
	InstitutionID         uuid.UUID
	ConnectorDefinitionID uuid.UUID
	Name                  string
	Status                string
}

type StoreCredentialsInput struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	SSLMode  string `json:"sslmode,omitempty"`
	Schema   string `json:"schema,omitempty"`
}

type EntitySelectionInput struct {
	SourceName   string  `json:"source_name"`
	TargetDomain *string `json:"target_domain"`
}

type WebhookCredentialsView struct {
	IngestToken string `json:"ingest_token"`
}

type DataSourceService struct {
	repo            *repository.DataSourceRepository
	institutionRepo *repository.InstitutionRepository
	connectorRepo   *repository.ConnectorDefinitionRepository
	credentialRepo  *repository.ConnectorCredentialRepository
	schemaRepo      *repository.SchemaSnapshotRepository
	entityRepo      *repository.DataSourceEntityRepository
	rawRecordRepo   *repository.RawRecordRepository
	registry        *connector.Registry
}

func NewDataSourceService(
	repo *repository.DataSourceRepository,
	institutionRepo *repository.InstitutionRepository,
	connectorRepo *repository.ConnectorDefinitionRepository,
	credentialRepo *repository.ConnectorCredentialRepository,
	schemaRepo *repository.SchemaSnapshotRepository,
	entityRepo *repository.DataSourceEntityRepository,
	rawRecordRepo *repository.RawRecordRepository,
) *DataSourceService {
	registry := connector.NewRegistry()
	registry.Register("postgres", connectorpostgres.NewFromJSON)
	registry.Register("postgresql", connectorpostgres.NewFromJSON)

	return &DataSourceService{
		repo:            repo,
		institutionRepo: institutionRepo,
		connectorRepo:   connectorRepo,
		credentialRepo:  credentialRepo,
		schemaRepo:      schemaRepo,
		entityRepo:      entityRepo,
		rawRecordRepo:   rawRecordRepo,
		registry:        registry,
	}
}

func (s *DataSourceService) Create(ctx context.Context, input CreateDataSourceInput) (*model.DataSource, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" || input.InstitutionID == uuid.Nil || input.ConnectorDefinitionID == uuid.Nil {
		return nil, ErrInvalidDataSource
	}

	if err := ensureInstitutionAccess(ctx, input.InstitutionID); err != nil {
		return nil, err
	}

	if _, err := s.institutionRepo.GetByID(ctx, input.InstitutionID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInstitutionNotFound
		}
		return nil, err
	}

	if _, err := s.connectorRepo.GetByID(ctx, input.ConnectorDefinitionID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectorDefinitionNotFound
		}
		return nil, err
	}

	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}

	dataSource := &model.DataSource{
		InstitutionID:         input.InstitutionID,
		ConnectorDefinitionID: input.ConnectorDefinitionID,
		Name:                  name,
		Status:                status,
	}

	if err := s.repo.Create(ctx, dataSource); err != nil {
		return nil, err
	}

	return dataSource, nil
}

func (s *DataSourceService) List(ctx context.Context, institutionID, connectorDefinitionID *uuid.UUID, limit, offset int) ([]model.DataSource, error) {
	if ac := auth.FromContext(ctx); ac != nil && ac.UserType == auth.UserTypeInstitution {
		if ac.InstitutionID == nil {
			return nil, ErrDataSourceAccessDenied
		}
		if institutionID != nil && *institutionID != *ac.InstitutionID {
			return nil, ErrDataSourceAccessDenied
		}
		institutionID = ac.InstitutionID
	}

	switch {
	case institutionID != nil:
		return s.repo.ListByInstitutionID(ctx, *institutionID)
	case connectorDefinitionID != nil:
		return s.repo.ListByConnectorDefinitionID(ctx, *connectorDefinitionID)
	default:
		return s.repo.List(ctx, limit, offset)
	}
}

func (s *DataSourceService) GetByID(ctx context.Context, id uuid.UUID) (*model.DataSource, error) {
	dataSource, err := s.repo.GetWithAssociations(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDataSourceNotFound
		}
		return nil, err
	}
	return dataSource, nil
}

func (s *DataSourceService) ListConnectorDefinitions(ctx context.Context) ([]model.ConnectorDefinition, error) {
	return s.connectorRepo.List(ctx, 0, 0)
}

func (s *DataSourceService) StoreCredentials(ctx context.Context, dataSourceID uuid.UUID, input StoreCredentialsInput) error {
	dataSource, err := s.ensureDataSourceAccess(ctx, dataSourceID)
	if err != nil {
		return err
	}

	if connectorwebhook.IsWebhookSlug(dataSource.ConnectorDefinition.Slug) {
		return s.storeWebhookCredentials(ctx, dataSourceID)
	}

	config, err := input.toPostgresConfig()
	if err != nil {
		return err
	}

	payload, err := json.Marshal(config)
	if err != nil {
		return err
	}

	return s.credentialRepo.UpsertByDataSourceID(ctx, &model.ConnectorCredential{
		DataSourceID:     dataSourceID,
		EncryptedPayload: model.JSONB(payload),
	})
}

func (s *DataSourceService) storeWebhookCredentials(ctx context.Context, dataSourceID uuid.UUID) error {
	token, err := connectorwebhook.GenerateIngestToken()
	if err != nil {
		return err
	}

	payload, err := json.Marshal(connector.WebhookConfig{IngestToken: token})
	if err != nil {
		return err
	}

	return s.credentialRepo.UpsertByDataSourceID(ctx, &model.ConnectorCredential{
		DataSourceID:     dataSourceID,
		EncryptedPayload: model.JSONB(payload),
	})
}

// GetCredentials returns stored credentials for a data source.
// Postgres sources return StoreCredentialsInput; webhook sources return WebhookCredentialsView.
func (s *DataSourceService) GetCredentials(ctx context.Context, dataSourceID uuid.UUID) (any, error) {
	dataSource, err := s.ensureDataSourceAccess(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	credential, err := s.credentialRepo.GetByDataSourceID(ctx, dataSourceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectorCredentialsNotFound
		}
		return nil, err
	}

	if connectorwebhook.IsWebhookSlug(dataSource.ConnectorDefinition.Slug) {
		var config connector.WebhookConfig
		if err := json.Unmarshal(credential.EncryptedPayload, &config); err != nil {
			return nil, ErrInvalidConnectorCredentials
		}
		return &WebhookCredentialsView{IngestToken: config.IngestToken}, nil
	}

	var config connector.PostgresConfig
	if err := json.Unmarshal(credential.EncryptedPayload, &config); err != nil {
		return nil, ErrInvalidConnectorCredentials
	}

	return &StoreCredentialsInput{
		Host:     config.Host,
		Port:     config.Port,
		Database: config.Database,
		Username: config.Username,
		Password: config.Password,
		SSLMode:  config.SSLMode,
		Schema:   config.Schema,
	}, nil
}

func (s *DataSourceService) TestConnection(ctx context.Context, dataSourceID uuid.UUID) error {
	conn, err := s.connectorForDataSource(ctx, dataSourceID)
	if err != nil {
		return err
	}
	return conn.TestConnection(ctx)
}

func (s *DataSourceService) DiscoverSchema(ctx context.Context, dataSourceID uuid.UUID) (*model.SchemaSnapshot, error) {
	conn, err := s.connectorForDataSource(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	if err := conn.TestConnection(ctx); err != nil {
		return nil, err
	}

	discovered, err := conn.DiscoverSchema(ctx)
	if err != nil {
		return nil, err
	}

	payload, err := json.Marshal(discovered)
	if err != nil {
		return nil, err
	}

	version, err := s.schemaRepo.NextVersion(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	snapshot := &model.SchemaSnapshot{
		DataSourceID: dataSourceID,
		Version:      version,
		SchemaJSON:   model.JSONB(payload),
	}
	if err := s.schemaRepo.Create(ctx, snapshot); err != nil {
		return nil, err
	}

	if err := s.replaceEntitiesFromSchema(ctx, dataSourceID, discovered); err != nil {
		return nil, err
	}

	return snapshot, nil
}

func (s *DataSourceService) GetSchema(ctx context.Context, dataSourceID uuid.UUID) (*model.SchemaSnapshot, error) {
	if _, err := s.ensureDataSourceAccess(ctx, dataSourceID); err != nil {
		return nil, err
	}

	snapshot, err := s.schemaRepo.GetLatestByDataSourceID(ctx, dataSourceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSchemaSnapshotNotFound
		}
		return nil, err
	}
	return snapshot, nil
}

func (s *DataSourceService) ListEntities(ctx context.Context, dataSourceID uuid.UUID) ([]model.DataSourceEntity, error) {
	if _, err := s.ensureDataSourceAccess(ctx, dataSourceID); err != nil {
		return nil, err
	}
	return s.entityRepo.ListByDataSourceID(ctx, dataSourceID)
}

func (s *DataSourceService) SaveEntities(ctx context.Context, dataSourceID uuid.UUID, selections []EntitySelectionInput) ([]model.DataSourceEntity, error) {
	dataSource, err := s.ensureDataSourceAccess(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	sourceType := sourceTypeForSlug(dataSource.ConnectorDefinition.Slug)

	entities := make([]model.DataSourceEntity, 0, len(selections))
	seen := make(map[string]struct{}, len(selections))
	for _, selection := range selections {
		sourceName := strings.TrimSpace(selection.SourceName)
		if sourceName == "" {
			return nil, ErrInvalidDataSource
		}
		if _, ok := seen[sourceName]; ok {
			continue
		}
		seen[sourceName] = struct{}{}

		targetDomain := normalizeOptionalString(selection.TargetDomain)
		entities = append(entities, model.DataSourceEntity{
			DataSourceID: dataSourceID,
			SourceName:   sourceName,
			SourceType:   sourceType,
			TargetDomain: targetDomain,
		})
	}

	if err := s.entityRepo.ReplaceByDataSourceID(ctx, dataSourceID, entities); err != nil {
		return nil, err
	}
	return s.entityRepo.ListByDataSourceID(ctx, dataSourceID)
}

func (s *DataSourceService) IngestWebhook(ctx context.Context, token, entityType string, payload json.RawMessage) (*model.RawRecord, error) {
	if strings.TrimSpace(token) == "" {
		return nil, ErrWebhookNotFound
	}
	if strings.TrimSpace(entityType) == "" {
		entityType = "unclassified"
	}

	credential, dataSource, err := s.credentialRepo.GetWebhookDataSourceByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWebhookNotFound
		}
		return nil, err
	}
	_ = credential

	var parsed map[string]any
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return nil, ErrInvalidWebhookPayload
	}
	if parsed == nil {
		return nil, ErrInvalidWebhookPayload
	}

	record := &model.RawRecord{
		InstitutionID: dataSource.InstitutionID,
		DataSourceID:  dataSource.ID,
		EntityType:    entityType,
		ExternalID:    connectorwebhook.InferExternalID(parsed),
		Payload:       model.JSONB(payload),
	}
	if err := s.rawRecordRepo.Create(ctx, record); err != nil {
		return nil, err
	}
	return record, nil
}

type RawRecordsResult struct {
	Data       []model.RawRecord              `json:"data"`
	Total      int64                          `json:"total"`
	Limit      int                            `json:"limit"`
	Offset     int                            `json:"offset"`
	ByEntity   []repository.EntityTypeCount   `json:"by_entity_type"`
}

func (s *DataSourceService) ListRawRecords(
	ctx context.Context,
	dataSourceID uuid.UUID,
	entityType string,
	limit, offset int,
) (*RawRecordsResult, error) {
	if _, err := s.ensureDataSourceAccess(ctx, dataSourceID); err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	records, err := s.rawRecordRepo.ListFiltered(ctx, dataSourceID, entityType, limit, offset)
	if err != nil {
		return nil, err
	}

	total, err := s.rawRecordRepo.CountByDataSourceID(ctx, dataSourceID, entityType)
	if err != nil {
		return nil, err
	}

	byEntity, err := s.rawRecordRepo.EntityTypeCounts(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	return &RawRecordsResult{
		Data:     records,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
		ByEntity: byEntity,
	}, nil
}

func (s *DataSourceService) connectorForDataSource(ctx context.Context, dataSourceID uuid.UUID) (connector.Connector, error) {
	dataSource, err := s.ensureDataSourceAccess(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}

	credential, err := s.credentialRepo.GetByDataSourceID(ctx, dataSourceID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectorCredentialsNotFound
		}
		return nil, err
	}

	payload := json.RawMessage(credential.EncryptedPayload)

	if connectorwebhook.IsWebhookSlug(dataSource.ConnectorDefinition.Slug) {
		return connectorwebhook.NewFromJSON(payload, dataSourceID, s.rawRecordRepo)
	}

	if _, err := connectorpostgres.NewFromJSON(payload); err != nil {
		return nil, ErrInvalidConnectorCredentials
	}

	return s.registry.New(dataSource.ConnectorDefinition.Slug, payload)
}

func (s *DataSourceService) ensureDataSourceAccess(ctx context.Context, id uuid.UUID) (*model.DataSource, error) {
	dataSource, err := s.repo.GetWithAssociations(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDataSourceNotFound
		}
		return nil, err
	}

	if err := ensureInstitutionAccess(ctx, dataSource.InstitutionID); err != nil {
		return nil, err
	}

	return dataSource, nil
}

func (s *DataSourceService) replaceEntitiesFromSchema(ctx context.Context, dataSourceID uuid.UUID, schema *connector.SchemaSnapshot) error {
	dataSource, err := s.repo.GetWithAssociations(ctx, dataSourceID)
	if err != nil {
		return err
	}

	sourceType := sourceTypeForSlug(dataSource.ConnectorDefinition.Slug)

	existing, err := s.entityRepo.ListByDataSourceID(ctx, dataSourceID)
	if err != nil {
		return err
	}

	targets := make(map[string]*string, len(existing))
	for _, entity := range existing {
		targets[entity.SourceName] = entity.TargetDomain
	}

	entities := make([]model.DataSourceEntity, 0, len(schema.Tables))
	for _, table := range schema.Tables {
		entities = append(entities, model.DataSourceEntity{
			DataSourceID: dataSourceID,
			SourceName:   table.Name,
			SourceType:   sourceType,
			TargetDomain: targets[table.Name],
		})
	}

	return s.entityRepo.ReplaceByDataSourceID(ctx, dataSourceID, entities)
}

func sourceTypeForSlug(slug string) string {
	if connectorwebhook.IsWebhookSlug(slug) {
		return "event"
	}
	return "table"
}

func ensureInstitutionAccess(ctx context.Context, institutionID uuid.UUID) error {
	ac := auth.FromContext(ctx)
	if ac == nil || ac.UserType != auth.UserTypeInstitution {
		return nil
	}
	if ac.InstitutionID == nil || *ac.InstitutionID != institutionID {
		return ErrDataSourceAccessDenied
	}
	return nil
}

func (i StoreCredentialsInput) toPostgresConfig() (connector.PostgresConfig, error) {
	config := connector.PostgresConfig{
		Host:     strings.TrimSpace(i.Host),
		Port:     i.Port,
		Database: strings.TrimSpace(i.Database),
		Username: strings.TrimSpace(i.Username),
		Password: i.Password,
		SSLMode:  strings.TrimSpace(i.SSLMode),
		Schema:   strings.TrimSpace(i.Schema),
	}

	if config.Host == "" || config.Database == "" || config.Username == "" || config.Password == "" {
		return connector.PostgresConfig{}, ErrInvalidConnectorCredentials
	}
	if config.Port == 0 {
		config.Port = 5432
	}
	if config.SSLMode == "" {
		config.SSLMode = "disable"
	}
	if config.Schema == "" {
		config.Schema = "public"
	}

	return config, nil
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
