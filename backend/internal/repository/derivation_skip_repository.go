package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type DerivationSkipRepository struct {
	*BaseRepository[model.DerivationSkip]
}

func NewDerivationSkipRepository(db *gorm.DB) *DerivationSkipRepository {
	return &DerivationSkipRepository{BaseRepository: NewBaseRepository[model.DerivationSkip](db)}
}

func (r *DerivationSkipRepository) CreateBatch(ctx context.Context, skips []model.DerivationSkip) error {
	if len(skips) == 0 {
		return nil
	}
	return r.dbWithContext(ctx).Create(&skips).Error
}
