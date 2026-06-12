package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConnectorDefinitionRepository struct {
	*BaseRepository[model.ConnectorDefinition]
}

func NewConnectorDefinitionRepository(db *gorm.DB) *ConnectorDefinitionRepository {
	return &ConnectorDefinitionRepository{BaseRepository: NewBaseRepository[model.ConnectorDefinition](db)}
}

func (r *ConnectorDefinitionRepository) GetBySlug(ctx context.Context, slug string) (*model.ConnectorDefinition, error) {
	var connector model.ConnectorDefinition
	if err := r.dbWithContext(ctx).First(&connector, "slug = ?", slug).Error; err != nil {
		return nil, err
	}
	return &connector, nil
}

func (r *ConnectorDefinitionRepository) ListByType(ctx context.Context, connectorType string) ([]model.ConnectorDefinition, error) {
	var connectors []model.ConnectorDefinition
	if err := r.dbWithContext(ctx).
		Where("type = ?", connectorType).
		Order("name ASC").
		Find(&connectors).Error; err != nil {
		return nil, err
	}
	return connectors, nil
}

type ConnectorCredentialRepository struct {
	*BaseRepository[model.ConnectorCredential]
}

func NewConnectorCredentialRepository(db *gorm.DB) *ConnectorCredentialRepository {
	return &ConnectorCredentialRepository{BaseRepository: NewBaseRepository[model.ConnectorCredential](db)}
}

func (r *ConnectorCredentialRepository) GetByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) (*model.ConnectorCredential, error) {
	var credential model.ConnectorCredential
	if err := r.dbWithContext(ctx).First(&credential, "data_source_id = ?", dataSourceID).Error; err != nil {
		return nil, err
	}
	return &credential, nil
}

func (r *ConnectorCredentialRepository) DeleteByDataSourceID(ctx context.Context, dataSourceID uuid.UUID) error {
	return r.dbWithContext(ctx).Delete(&model.ConnectorCredential{}, "data_source_id = ?", dataSourceID).Error
}
