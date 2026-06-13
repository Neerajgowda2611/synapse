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
	return r.GetByID(ctx, id, "Users", "DataSources", "Learners")
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

type InstitutionUserRepository struct {
	*BaseRepository[model.InstitutionUser]
}

func NewInstitutionUserRepository(db *gorm.DB) *InstitutionUserRepository {
	return &InstitutionUserRepository{BaseRepository: NewBaseRepository[model.InstitutionUser](db)}
}

func (r *InstitutionUserRepository) GetByEmail(ctx context.Context, email string) (*model.InstitutionUser, error) {
	var user model.InstitutionUser
	if err := r.dbWithContext(ctx).First(&user, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *InstitutionUserRepository) GetByZitadelSub(ctx context.Context, sub string) (*model.InstitutionUser, error) {
	var user model.InstitutionUser
	if err := r.dbWithContext(ctx).First(&user, "zitadel_sub = ?", sub).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *InstitutionUserRepository) LinkZitadelSub(ctx context.Context, id uuid.UUID, sub string) error {
	return r.dbWithContext(ctx).
		Model(&model.InstitutionUser{}).
		Where("id = ?", id).
		Update("zitadel_sub", sub).Error
}

func (r *InstitutionUserRepository) ListByInstitutionID(ctx context.Context, institutionID uuid.UUID) ([]model.InstitutionUser, error) {
	var users []model.InstitutionUser
	if err := r.dbWithContext(ctx).
		Where("institution_id = ?", institutionID).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}
