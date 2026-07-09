package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (r *JobRepository) ListActiveForInstitution(ctx context.Context, institutionID *uuid.UUID) ([]model.Job, error) {
	query := r.dbWithContext(ctx).Where("status = ?", "active")
	if institutionID != nil {
		query = query.Where("institution_id IS NULL OR institution_id = ?", *institutionID)
	}
	var rows []model.Job
	if err := query.Order("created_at DESC").Find(&rows).Error; err != nil {
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

func (r *JobRepository) GetByXintSource(ctx context.Context, sourceApp, xintSourceRef string) (*model.Job, error) {
	var row model.Job
	err := r.dbWithContext(ctx).
		Where("source_app = ? AND xint_source_ref = ?", sourceApp, xintSourceRef).
		First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *JobRepository) UpsertIngested(ctx context.Context, job *model.Job) error {
	if job.ID != uuid.Nil {
		return r.dbWithContext(ctx).Save(job).Error
	}
	return r.dbWithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "source_app"}, {Name: "xint_source_ref"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"title", "company_name", "subtitle", "external_url",
			"reward_system_id", "institution_id", "status", "updated_at",
		}),
	}).Create(job).Error
}
