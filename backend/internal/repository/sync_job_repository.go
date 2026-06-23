package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type SyncJobRepository struct {
	*BaseRepository[model.SyncJob]
}

func NewSyncJobRepository(db *gorm.DB) *SyncJobRepository {
	return &SyncJobRepository{BaseRepository: NewBaseRepository[model.SyncJob](db)}
}

func (r *SyncJobRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID, limit, offset int) ([]model.SyncJob, error) {
	var jobs []model.SyncJob
	query := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *SyncJobRepository) ListByStatus(ctx context.Context, status string, limit, offset int) ([]model.SyncJob, error) {
	var jobs []model.SyncJob
	query := r.dbWithContext(ctx).
		Where("status = ?", status).
		Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *SyncJobRepository) GetLatestByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) (*model.SyncJob, error) {
	var job model.SyncJob
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("created_at DESC").
		First(&job).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *SyncJobRepository) UpdateProgress(
	ctx context.Context,
	id uuid.UUID,
	status string,
	recordsProcessed, recordsFailed int,
	completedAt *time.Time,
	errorMessage *string,
) error {
	updates := map[string]any{
		"status":            status,
		"records_processed": recordsProcessed,
		"records_failed":    recordsFailed,
	}
	if completedAt != nil {
		updates["completed_at"] = *completedAt
	}
	if errorMessage != nil {
		updates["error_message"] = *errorMessage
	}
	return r.dbWithContext(ctx).
		Model(&model.SyncJob{}).
		Where("id = ?", id).
		Updates(updates).Error
}
