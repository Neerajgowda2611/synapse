package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type RewardSystemRepository struct {
	*BaseRepository[model.RewardSystem]
}

func NewRewardSystemRepository(db *gorm.DB) *RewardSystemRepository {
	return &RewardSystemRepository{BaseRepository: NewBaseRepository[model.RewardSystem](db)}
}
