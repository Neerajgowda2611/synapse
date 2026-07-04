package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type BindingRegistryRepository struct {
	*BaseRepository[model.BindingRegistry]
}

func NewBindingRegistryRepository(db *gorm.DB) *BindingRegistryRepository {
	return &BindingRegistryRepository{BaseRepository: NewBaseRepository[model.BindingRegistry](db)}
}

func (r *BindingRegistryRepository) ListApprovedBySource(ctx context.Context, sourceConnector, sourceEventType string) ([]model.BindingRegistry, error) {
	var bindings []model.BindingRegistry
	err := r.dbWithContext(ctx).
		Where("source_connector = ? AND source_event_type = ? AND status = ?", sourceConnector, sourceEventType, model.BindingStatusApproved).
		Order("version DESC, created_at DESC").
		Find(&bindings).Error
	if err != nil {
		return nil, err
	}
	return bindings, nil
}
