package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type RewardSystemRepository struct {
	*BaseRepository[model.RewardSystem]
}

func NewRewardSystemRepository(db *gorm.DB) *RewardSystemRepository {
	return &RewardSystemRepository{BaseRepository: NewBaseRepository[model.RewardSystem](db)}
}

func (r *RewardSystemRepository) GetByID(ctx context.Context, id string) (*model.RewardSystem, error) {
	var row model.RewardSystem
	if err := r.dbWithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RewardSystemRepository) ListAll(ctx context.Context) ([]model.RewardSystem, error) {
	var rows []model.RewardSystem
	err := r.dbWithContext(ctx).
		Order("id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
