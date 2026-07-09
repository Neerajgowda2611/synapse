package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (r *RewardSystemRepository) Upsert(ctx context.Context, row *model.RewardSystem) error {
	return r.dbWithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"version", "label", "spec", "updated_at",
		}),
	}).Create(row).Error
}
