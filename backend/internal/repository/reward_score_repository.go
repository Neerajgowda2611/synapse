package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RewardScoreRepository struct {
	*BaseRepository[model.RewardScore]
}

func NewRewardScoreRepository(db *gorm.DB) *RewardScoreRepository {
	return &RewardScoreRepository{BaseRepository: NewBaseRepository[model.RewardScore](db)}
}

func (r *RewardScoreRepository) Upsert(ctx context.Context, row *model.RewardScore) error {
	return r.dbWithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "run_id"},
			{Name: "user_id"},
			{Name: "reward_system_id"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"score", "ci_lower", "ci_upper", "spec", "readings",
		}),
	}).Create(row).Error
}
