package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type InstitutionRepository struct {
	*BaseRepository[model.Institution]
}

func NewInstitutionRepository(db *gorm.DB) *InstitutionRepository {
	return &InstitutionRepository{BaseRepository: NewBaseRepository[model.Institution](db)}
}

func (r *InstitutionRepository) GetWithAssociations(ctx context.Context, id uuid.UUID) (*model.Institution, error) {
	return r.GetByID(ctx, id, "DataSources", "Learners")
}

func (r *InstitutionRepository) ListByStatus(ctx context.Context, status string, limit, offset int) ([]model.Institution, error) {
	var institutions []model.Institution
	query := r.dbWithContext(ctx).Where("status = ?", status).Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&institutions).Error; err != nil {
		return nil, err
	}
	return institutions, nil
}
