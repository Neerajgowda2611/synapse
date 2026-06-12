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

func (r *LearnerRepository) GetWithProfile(ctx context.Context, id uuid.UUID) (*model.Learner, error) {
	return r.GetByID(ctx, id, "Profile", "Identities")
}

func (r *LearnerRepository) GetFullProfile(ctx context.Context, id uuid.UUID) (*model.Learner, error) {
	return r.GetByID(
		ctx,
		id,
		"Profile",
		"Identities",
		"Education",
		"AttendanceRecords",
		"Assessments",
		"Payments",
		"Skills",
		"Certifications",
		"Projects",
		"Placements",
	)
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

type LearnerProfileRepository struct {
	*BaseRepository[model.LearnerProfile]
}

func NewLearnerProfileRepository(db *gorm.DB) *LearnerProfileRepository {
	return &LearnerProfileRepository{BaseRepository: NewBaseRepository[model.LearnerProfile](db)}
}

func (r *LearnerProfileRepository) GetByLearnerID(ctx context.Context, learnerID uuid.UUID) (*model.LearnerProfile, error) {
	var profile model.LearnerProfile
	if err := r.dbWithContext(ctx).First(&profile, "learner_id = ?", learnerID).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

type LearnerEducationRepository struct {
	*BaseRepository[model.LearnerEducation]
}

func NewLearnerEducationRepository(db *gorm.DB) *LearnerEducationRepository {
	return &LearnerEducationRepository{BaseRepository: NewBaseRepository[model.LearnerEducation](db)}
}

func (r *LearnerEducationRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerEducation, error) {
	var education []model.LearnerEducation
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("created_at DESC").
		Find(&education).Error; err != nil {
		return nil, err
	}
	return education, nil
}

type LearnerAttendanceRecordRepository struct {
	*BaseRepository[model.LearnerAttendanceRecord]
}

func NewLearnerAttendanceRecordRepository(db *gorm.DB) *LearnerAttendanceRecordRepository {
	return &LearnerAttendanceRecordRepository{BaseRepository: NewBaseRepository[model.LearnerAttendanceRecord](db)}
}

func (r *LearnerAttendanceRecordRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID, limit, offset int) ([]model.LearnerAttendanceRecord, error) {
	var records []model.LearnerAttendanceRecord
	query := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("attendance_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

type LearnerAssessmentRepository struct {
	*BaseRepository[model.LearnerAssessment]
}

func NewLearnerAssessmentRepository(db *gorm.DB) *LearnerAssessmentRepository {
	return &LearnerAssessmentRepository{BaseRepository: NewBaseRepository[model.LearnerAssessment](db)}
}

func (r *LearnerAssessmentRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerAssessment, error) {
	var assessments []model.LearnerAssessment
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("attempt_date DESC, created_at DESC").
		Find(&assessments).Error; err != nil {
		return nil, err
	}
	return assessments, nil
}

type LearnerPaymentRepository struct {
	*BaseRepository[model.LearnerPayment]
}

func NewLearnerPaymentRepository(db *gorm.DB) *LearnerPaymentRepository {
	return &LearnerPaymentRepository{BaseRepository: NewBaseRepository[model.LearnerPayment](db)}
}

func (r *LearnerPaymentRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerPayment, error) {
	var payments []model.LearnerPayment
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("due_date DESC, created_at DESC").
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

type LearnerSkillRepository struct {
	*BaseRepository[model.LearnerSkill]
}

func NewLearnerSkillRepository(db *gorm.DB) *LearnerSkillRepository {
	return &LearnerSkillRepository{BaseRepository: NewBaseRepository[model.LearnerSkill](db)}
}

func (r *LearnerSkillRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerSkill, error) {
	var skills []model.LearnerSkill
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("skill_name ASC").
		Find(&skills).Error; err != nil {
		return nil, err
	}
	return skills, nil
}

type LearnerCertificationRepository struct {
	*BaseRepository[model.LearnerCertification]
}

func NewLearnerCertificationRepository(db *gorm.DB) *LearnerCertificationRepository {
	return &LearnerCertificationRepository{BaseRepository: NewBaseRepository[model.LearnerCertification](db)}
}

func (r *LearnerCertificationRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerCertification, error) {
	var certifications []model.LearnerCertification
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("issued_date DESC, created_at DESC").
		Find(&certifications).Error; err != nil {
		return nil, err
	}
	return certifications, nil
}

type LearnerProjectRepository struct {
	*BaseRepository[model.LearnerProject]
}

func NewLearnerProjectRepository(db *gorm.DB) *LearnerProjectRepository {
	return &LearnerProjectRepository{BaseRepository: NewBaseRepository[model.LearnerProject](db)}
}

func (r *LearnerProjectRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerProject, error) {
	var projects []model.LearnerProject
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("start_date DESC, created_at DESC").
		Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

type LearnerPlacementRepository struct {
	*BaseRepository[model.LearnerPlacement]
}

func NewLearnerPlacementRepository(db *gorm.DB) *LearnerPlacementRepository {
	return &LearnerPlacementRepository{BaseRepository: NewBaseRepository[model.LearnerPlacement](db)}
}

func (r *LearnerPlacementRepository) ListByLearnerID(ctx context.Context, learnerID uuid.UUID) ([]model.LearnerPlacement, error) {
	var placements []model.LearnerPlacement
	if err := r.dbWithContext(ctx).
		Where("learner_id = ?", learnerID).
		Order("joining_date DESC, created_at DESC").
		Find(&placements).Error; err != nil {
		return nil, err
	}
	return placements, nil
}
