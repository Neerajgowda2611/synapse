package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type SignalRepository struct {
	*BaseRepository[model.Signal]
}

func NewSignalRepository(db *gorm.DB) *SignalRepository {
	return &SignalRepository{BaseRepository: NewBaseRepository[model.Signal](db)}
}

func (r *SignalRepository) CreateBatch(ctx context.Context, signals []model.Signal) error {
	if len(signals) == 0 {
		return nil
	}
	return r.dbWithContext(ctx).Create(&signals).Error
}
