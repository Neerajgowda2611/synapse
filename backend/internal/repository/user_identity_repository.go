package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type UserIdentityRepository struct {
	*BaseRepository[model.UserIdentity]
}

func NewUserIdentityRepository(db *gorm.DB) *UserIdentityRepository {
	return &UserIdentityRepository{BaseRepository: NewBaseRepository[model.UserIdentity](db)}
}

func (r *UserIdentityRepository) GetByDataSourceAndExternalID(ctx context.Context, dataSourceID uuid.UUID, externalID string) (*model.UserIdentity, error) {
	var identity model.UserIdentity
	err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND external_id = ?", dataSourceID, externalID).
		First(&identity).Error
	if err != nil {
		return nil, err
	}
	return &identity, nil
}
