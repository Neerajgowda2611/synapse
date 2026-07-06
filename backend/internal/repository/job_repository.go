package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type JobRepository struct {
	*BaseRepository[model.Job]
}

func NewJobRepository(db *gorm.DB) *JobRepository {
	return &JobRepository{BaseRepository: NewBaseRepository[model.Job](db)}
}

func (r *JobRepository) ListActive(ctx context.Context) ([]model.Job, error) {
	var rows []model.Job
	err := r.dbWithContext(ctx).
		Where("status = ?", "active").
		Order("created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *JobRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Job, error) {
	var row model.Job
	if err := r.dbWithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}
