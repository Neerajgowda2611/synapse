package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type MetricNormRepository struct {
	*BaseRepository[model.MetricNorm]
}

func NewMetricNormRepository(db *gorm.DB) *MetricNormRepository {
	return &MetricNormRepository{BaseRepository: NewBaseRepository[model.MetricNorm](db)}
}
