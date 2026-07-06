package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConstructClaimRegistryRepository struct {
	*BaseRepository[model.ConstructClaimRegistry]
}

func NewConstructClaimRegistryRepository(db *gorm.DB) *ConstructClaimRegistryRepository {
	return &ConstructClaimRegistryRepository{BaseRepository: NewBaseRepository[model.ConstructClaimRegistry](db)}
}

func (r *ConstructClaimRegistryRepository) ListByTrait(ctx context.Context, trait string) ([]model.ConstructClaimRegistry, error) {
	var rows []model.ConstructClaimRegistry
	err := r.dbWithContext(ctx).
		Where("trait = ?", trait).
		Order("claim_id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *ConstructClaimRegistryRepository) ListAll(ctx context.Context) ([]model.ConstructClaimRegistry, error) {
	var rows []model.ConstructClaimRegistry
	err := r.dbWithContext(ctx).
		Order("claim_id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
