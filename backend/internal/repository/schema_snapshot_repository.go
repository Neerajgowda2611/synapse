package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type SchemaSnapshotRepository struct {
	*BaseRepository[model.SchemaSnapshot]
}

func NewSchemaSnapshotRepository(db *gorm.DB) *SchemaSnapshotRepository {
	return &SchemaSnapshotRepository{BaseRepository: NewBaseRepository[model.SchemaSnapshot](db)}
}

func (r *SchemaSnapshotRepository) GetLatestByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) (*model.SchemaSnapshot, error) {
	var snapshot model.SchemaSnapshot
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("version DESC, created_at DESC").
		First(&snapshot).Error; err != nil {
		return nil, err
	}
	return &snapshot, nil
}

func (r *SchemaSnapshotRepository) GetByDataSourceIDAndVersion(ctx context.Context, dataSourceID uuid.UUID, version int) (*model.SchemaSnapshot, error) {
	var snapshot model.SchemaSnapshot
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND version = ?", dataSourceID, version).
		First(&snapshot).Error; err != nil {
		return nil, err
	}
	return &snapshot, nil
}

func (r *SchemaSnapshotRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) ([]model.SchemaSnapshot, error) {
	var snapshots []model.SchemaSnapshot
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("version DESC, created_at DESC").
		Find(&snapshots).Error; err != nil {
		return nil, err
	}
	return snapshots, nil
}
