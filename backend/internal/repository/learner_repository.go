package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type LearnerRepository struct {
	*BaseRepository[model.Learner]
}

func NewLearnerRepository(db *gorm.DB) *LearnerRepository {
	return &LearnerRepository{BaseRepository: NewBaseRepository[model.Learner](db)}
}

func (r *LearnerRepository) GetWithIdentities(ctx context.Context, id uuid.UUID) (*model.Learner, error) {
	return r.GetByID(ctx, id, "Identities")
}

func (r *LearnerRepository) GetByZitadelSub(ctx context.Context, sub string) (*model.Learner, error) {
	var learner model.Learner
	if err := r.dbWithContext(ctx).First(&learner, "zitadel_sub = ?", sub).Error; err != nil {
		return nil, err
	}
	return &learner, nil
}

func (r *LearnerRepository) GetByEmail(ctx context.Context, email string) (*model.Learner, error) {
	var learner model.Learner
	if err := r.dbWithContext(ctx).First(&learner, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &learner, nil
}

func (r *LearnerRepository) LinkZitadelSub(ctx context.Context, id uuid.UUID, sub string) error {
	return r.dbWithContext(ctx).
		Model(&model.Learner{}).
		Where("id = ?", id).
		Update("zitadel_sub", sub).Error
}

func (r *LearnerRepository) GetByCanonicalLearnerID(ctx context.Context, institutionID uuid.UUID, canonicalLearnerID string) (*model.Learner, error) {
	var learner model.Learner
	if err := r.dbWithContext(ctx).
		Where("institution_id = ? AND canonical_learner_id = ?", institutionID, canonicalLearnerID).
		First(&learner).Error; err != nil {
		return nil, err
	}
	return &learner, nil
}

func (r *LearnerRepository) ListByInstitutionID(ctx context.Context, institutionID uuid.UUID, limit, offset int) ([]model.Learner, error) {
	var learners []model.Learner
	query := r.dbWithContext(ctx).
		Where("institution_id = ?", institutionID).
		Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&learners).Error; err != nil {
		return nil, err
	}
	return learners, nil
}

type LearnerIdentityRepository struct {
	*BaseRepository[model.LearnerIdentity]
}

func NewLearnerIdentityRepository(db *gorm.DB) *LearnerIdentityRepository {
	return &LearnerIdentityRepository{BaseRepository: NewBaseRepository[model.LearnerIdentity](db)}
}

func (r *LearnerIdentityRepository) GetByExternalID(ctx context.Context, dataSourceID uuid.UUID, externalID string) (*model.LearnerIdentity, error) {
	var identity model.LearnerIdentity
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND external_id = ?", dataSourceID, externalID).
		First(&identity).Error; err != nil {
		return nil, err
	}
	return &identity, nil
}

func (r *LearnerIdentityRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerIdentity, error) {
	var identities []model.LearnerIdentity
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("created_at DESC").
		Find(&identities).Error; err != nil {
		return nil, err
	}
	return identities, nil
}
