package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/connector"
	connectorpostgres "github.com/profiler/backend/internal/connector/postgres"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
)

const (
	syncStatusRunning   = "running"
	syncStatusCompleted = "completed"
	syncStatusFailed    = "failed"

	syncBatchSize    = 500
	syncMaxRowsTable = 10000
)

type SyncService struct {
	dataSourceRepo *repository.DataSourceRepository
	credentialRepo *repository.ConnectorCredentialRepository
	schemaRepo     *repository.SchemaSnapshotRepository
	syncJobRepo    *repository.SyncJobRepository
	rawRecordRepo  *repository.RawRecordRepository
	registry       *connector.Registry
}

func NewSyncService(
	dataSourceRepo *repository.DataSourceRepository,
	credentialRepo *repository.ConnectorCredentialRepository,
	schemaRepo *repository.SchemaSnapshotRepository,
	syncJobRepo *repository.SyncJobRepository,
	rawRecordRepo *repository.RawRecordRepository,
	registry *connector.Registry,
) *SyncService {
	return &SyncService{
		dataSourceRepo: dataSourceRepo,
		credentialRepo: credentialRepo,
		schemaRepo:     schemaRepo,
		syncJobRepo:    syncJobRepo,
		rawRecordRepo:  rawRecordRepo,
		registry:       registry,
	}
}

func (s *SyncService) StartInitialImportAsync(dataSourceID uuid.UUID, snapshotID uuid.UUID) {
	go func() {
		ctx := context.Background()
		if err := s.RunInitialImport(ctx, dataSourceID, snapshotID); err != nil {
			log.Printf("initial import failed for data source %s: %v", dataSourceID, err)
		}
	}()
}

func (s *SyncService) RunInitialImport(ctx context.Context, dataSourceID uuid.UUID, snapshotID uuid.UUID) error {
	dataSource, err := s.dataSourceRepo.GetWithAssociations(ctx, dataSourceID)
	if err != nil {
		return err
	}
	if dataSource.RawStorageConsentAt == nil {
		return ErrRawStorageConsentRequired
	}
	if dataSource.ConnectorDefinition == nil || !connectorpostgres.IsPostgresSlug(dataSource.ConnectorDefinition.Slug) {
		return nil
	}

	snapshot, err := s.schemaRepo.GetByID(ctx, snapshotID)
	if err != nil {
		return err
	}

	var schema connector.SchemaSnapshot
	if err := json.Unmarshal(snapshot.SchemaJSON, &schema); err != nil {
		return err
	}

	now := time.Now()
	job := &model.SyncJob{
		DataSourceID: dataSourceID,
		Status:       syncStatusRunning,
		StartedAt:    &now,
	}
	if err := s.syncJobRepo.Create(ctx, job); err != nil {
		return err
	}

	conn, err := s.connectorForDataSource(ctx, dataSourceID, dataSource)
	if err != nil {
		return s.failJob(ctx, job.ID, err)
	}

	processed := 0
	failed := 0

	for _, table := range schema.Tables {
		tableProcessed, tableFailed, err := s.importTable(ctx, conn, dataSource, job.ID, table.Name)
		processed += tableProcessed
		failed += tableFailed
		if err != nil {
			msg := fmt.Sprintf("table %s: %v", table.Name, err)
			return s.failJobWithCounts(ctx, job.ID, processed, failed, msg)
		}

		if err := s.syncJobRepo.UpdateProgress(ctx, job.ID, syncStatusRunning, processed, failed, nil, nil); err != nil {
			return err
		}
	}

	completedAt := time.Now()
	if err := s.syncJobRepo.UpdateProgress(ctx, job.ID, syncStatusCompleted, processed, failed, &completedAt, nil); err != nil {
		return err
	}
	return s.dataSourceRepo.UpdateLastSyncAt(ctx, dataSourceID, completedAt)
}

func (s *SyncService) importTable(
	ctx context.Context,
	conn connector.Connector,
	dataSource *model.DataSource,
	jobID uuid.UUID,
	tableName string,
) (int, int, error) {
	processed := 0
	failed := 0
	offset := 0

	for processed < syncMaxRowsTable {
		rows, err := conn.FetchRecords(ctx, tableName, map[string]any{
			"limit":  syncBatchSize,
			"offset": offset,
		})
		if err != nil {
			return processed, failed, err
		}
		if len(rows) == 0 {
			break
		}

		batch := make([]model.RawRecord, 0, len(rows))
		for _, row := range rows {
			payload, err := json.Marshal(row)
			if err != nil {
				failed++
				continue
			}
			batch = append(batch, model.RawRecord{
				InstitutionID: dataSource.InstitutionID,
				DataSourceID:  dataSource.ID,
				SyncJobID:     &jobID,
				EntityType:    tableName,
				ExternalID:    connector.InferExternalID(row),
				Payload:       model.JSONB(payload),
			})
		}

		if err := s.rawRecordRepo.CreateBatch(ctx, batch); err != nil {
			return processed, failed, err
		}

		processed += len(batch)
		offset += len(rows)

		if len(rows) < syncBatchSize {
			break
		}
		if processed >= syncMaxRowsTable {
			break
		}
	}

	return processed, failed, nil
}

func (s *SyncService) connectorForDataSource(ctx context.Context, dataSourceID uuid.UUID, dataSource *model.DataSource) (connector.Connector, error) {
	credential, err := s.credentialRepo.GetByDataSourceID(ctx, dataSourceID)
	if err != nil {
		return nil, err
	}
	return s.registry.New(dataSource.ConnectorDefinition.Slug, json.RawMessage(credential.EncryptedPayload))
}

func (s *SyncService) failJob(ctx context.Context, jobID uuid.UUID, err error) error {
	return s.failJobWithCounts(ctx, jobID, 0, 0, err.Error())
}

func (s *SyncService) failJobWithCounts(ctx context.Context, jobID uuid.UUID, processed, failed int, message string) error {
	completedAt := time.Now()
	return s.syncJobRepo.UpdateProgress(ctx, jobID, syncStatusFailed, processed, failed, &completedAt, &message)
}

func (s *SyncService) ListSyncJobs(ctx context.Context, dataSourceID uuid.UUID, limit int) ([]model.SyncJob, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.syncJobRepo.ListByDataSourceID(ctx, dataSourceID, limit, 0)
}

func (s *SyncService) GetLatestSyncJob(ctx context.Context, dataSourceID uuid.UUID) (*model.SyncJob, error) {
	return s.syncJobRepo.GetLatestByDataSourceID(ctx, dataSourceID)
}
