package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type MetricRunRepository struct {
	*BaseRepository[model.MetricRun]
}

func NewMetricRunRepository(db *gorm.DB) *MetricRunRepository {
	return &MetricRunRepository{BaseRepository: NewBaseRepository[model.MetricRun](db)}
}

func (r *MetricRunRepository) LatestByUserBefore(ctx context.Context, userID uuid.UUID, asOf time.Time) (*model.MetricRun, error) {
	var row model.MetricRun
	err := r.dbWithContext(ctx).
		Where("user_id = ? AND as_of <= ?", userID, asOf).
		Order("as_of DESC, created_at DESC").
		First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}
