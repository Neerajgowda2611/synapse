package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type DerivationRuleRegistryRepository struct {
	*BaseRepository[model.DerivationRuleRegistry]
}

func NewDerivationRuleRegistryRepository(db *gorm.DB) *DerivationRuleRegistryRepository {
	return &DerivationRuleRegistryRepository{BaseRepository: NewBaseRepository[model.DerivationRuleRegistry](db)}
}

func (r *DerivationRuleRegistryRepository) ListApproved(ctx context.Context) ([]model.DerivationRuleRegistry, error) {
	var rows []model.DerivationRuleRegistry
	err := r.dbWithContext(ctx).
		Where("status = ?", model.DerivationRuleStatusApproved).
		Order("rule_id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
