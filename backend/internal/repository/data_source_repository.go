package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type DataSourceRepository struct {
	*BaseRepository[model.DataSource]
}

func NewDataSourceRepository(db *gorm.DB) *DataSourceRepository {
	return &DataSourceRepository{BaseRepository: NewBaseRepository[model.DataSource](db)}
}

func (r *DataSourceRepository) GetWithAssociations(ctx context.Context, id uuid.UUID) (*model.DataSource, error) {
	return r.GetByID(ctx, id, "Institution", "ConnectorDefinition", "Credentials")
}

func (r *DataSourceRepository) ListByInstitutionID(ctx context.Context, institutionID uuid.UUID) ([]model.DataSource, error) {
	var dataSources []model.DataSource
	if err := r.dbWithContext(ctx).
		Where("institution_id = ?", institutionID).
		Order("created_at DESC").
		Find(&dataSources).Error; err != nil {
		return nil, err
	}
	return dataSources, nil
}

func (r *DataSourceRepository) ListByConnectorDefinitionID(ctx context.Context, connectorDefinitionID uuid.UUID) ([]model.DataSource, error) {
	var dataSources []model.DataSource
	if err := r.dbWithContext(ctx).
		Where("connector_definition_id = ?", connectorDefinitionID).
		Order("created_at DESC").
		Find(&dataSources).Error; err != nil {
		return nil, err
	}
	return dataSources, nil
}

func (r *DataSourceRepository) UpdateLastSyncAt(ctx context.Context, id uuid.UUID, syncedAt time.Time) error {
	return r.dbWithContext(ctx).
		Model(&model.DataSource{}).
		Where("id = ?", id).
		Update("last_sync_at", syncedAt).Error
}

type DataSourceEntityRepository struct {
	*BaseRepository[model.DataSourceEntity]
}

func NewDataSourceEntityRepository(db *gorm.DB) *DataSourceEntityRepository {
	return &DataSourceEntityRepository{BaseRepository: NewBaseRepository[model.DataSourceEntity](db)}
}

func (r *DataSourceEntityRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) ([]model.DataSourceEntity, error) {
	var entities []model.DataSourceEntity
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ?", dataSourceID).
		Order("source_name ASC").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

func (r *DataSourceEntityRepository) ListByTargetDomain(ctx context.Context, dataSourceID uuid.UUID, targetDomain string) ([]model.DataSourceEntity, error) {
	var entities []model.DataSourceEntity
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND target_domain = ?", dataSourceID, targetDomain).
		Order("source_name ASC").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}
