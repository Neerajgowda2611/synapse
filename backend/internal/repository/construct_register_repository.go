package repository

import (
	"context"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConstructRegisterRepository struct {
	*BaseRepository[model.ConstructRegister]
}

func NewConstructRegisterRepository(db *gorm.DB) *ConstructRegisterRepository {
	return &ConstructRegisterRepository{BaseRepository: NewBaseRepository[model.ConstructRegister](db)}
}

func (r *ConstructRegisterRepository) ListAll(ctx context.Context) ([]model.ConstructRegister, error) {
	var rows []model.ConstructRegister
	err := r.dbWithContext(ctx).
		Order("construct_id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
