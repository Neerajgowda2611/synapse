package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConstructEstimateRepository struct {
	*BaseRepository[model.ConstructEstimate]
}

func NewConstructEstimateRepository(db *gorm.DB) *ConstructEstimateRepository {
	return &ConstructEstimateRepository{BaseRepository: NewBaseRepository[model.ConstructEstimate](db)}
}

func (r *ConstructEstimateRepository) CreateBatch(ctx context.Context, rows []model.ConstructEstimate) error {
	if len(rows) == 0 {
		return nil
	}
	return r.dbWithContext(ctx).Create(&rows).Error
}

func (r *ConstructEstimateRepository) LatestByUser(ctx context.Context, userID uuid.UUID, asOf time.Time) ([]model.ConstructEstimate, *uuid.UUID, error) {
	type runIDRow struct {
		RunID uuid.UUID
	}
	var rid runIDRow
	if err := r.dbWithContext(ctx).
		Table("metric_runs").
		Select("id as run_id").
		Where("user_id = ? AND as_of <= ?", userID, asOf).
		Order("as_of DESC, created_at DESC").
		Limit(1).
		Scan(&rid).Error; err != nil {
		return nil, nil, err
	}
	if rid.RunID == uuid.Nil {
		return nil, nil, gorm.ErrRecordNotFound
	}
	var rows []model.ConstructEstimate
	if err := r.dbWithContext(ctx).
		Where("run_id = ? AND user_id = ?", rid.RunID, userID).
		Order("trait ASC").
		Find(&rows).Error; err != nil {
		return nil, nil, err
	}
	return rows, &rid.RunID, nil
}
