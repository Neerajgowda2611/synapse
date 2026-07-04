package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ObservationTypeRegistryRepository struct {
	*BaseRepository[model.ObservationTypeRegistry]
}

func NewObservationTypeRegistryRepository(db *gorm.DB) *ObservationTypeRegistryRepository {
	return &ObservationTypeRegistryRepository{BaseRepository: NewBaseRepository[model.ObservationTypeRegistry](db)}
}

func (r *ObservationTypeRegistryRepository) GetByType(ctx context.Context, observationType string) (*model.ObservationTypeRegistry, error) {
	var row model.ObservationTypeRegistry
	err := r.dbWithContext(ctx).Where("observation_type = ?", observationType).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}
