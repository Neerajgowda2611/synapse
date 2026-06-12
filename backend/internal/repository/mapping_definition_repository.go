package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type MappingDefinitionRepository struct {
	*BaseRepository[model.MappingDefinition]
}

func NewMappingDefinitionRepository(db *gorm.DB) *MappingDefinitionRepository {
	return &MappingDefinitionRepository{BaseRepository: NewBaseRepository[model.MappingDefinition](db)}
}

func (r *MappingDefinitionRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) ([]model.MappingDefinition, error) {
	var mappings []model.MappingDefinition
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("created_at DESC").
		Find(&mappings).Error; err != nil {
		return nil, err
	}
	return mappings, nil
}

func (r *MappingDefinitionRepository) GetByDataSourceIDAndTargetDomain(ctx context.Context, dataSourceID uuid.UUID, targetDomain string) (*model.MappingDefinition, error) {
	var mapping model.MappingDefinition
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND target_domain = ?", dataSourceID, targetDomain).
		Order("created_at DESC").
		First(&mapping).Error; err != nil {
		return nil, err
	}
	return &mapping, nil
}

func (r *MappingDefinitionRepository) ListApprovedByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) ([]model.MappingDefinition, error) {
	var mappings []model.MappingDefinition
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND approved = ?", dataSourceID, true).
		Order("created_at DESC").
		Find(&mappings).Error; err != nil {
		return nil, err
	}
	return mappings, nil
}
