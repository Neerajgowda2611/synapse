package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type MetricNormRepository struct {
	*BaseRepository[model.MetricNorm]
}

func NewMetricNormRepository(db *gorm.DB) *MetricNormRepository {
	return &MetricNormRepository{BaseRepository: NewBaseRepository[model.MetricNorm](db)}
}

func (r *MetricNormRepository) ListAll(ctx context.Context) ([]model.MetricNorm, error) {
	var rows []model.MetricNorm
	err := r.dbWithContext(ctx).
		Order("signal_type ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
