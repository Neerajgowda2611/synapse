package repository

import (
	"context"

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
