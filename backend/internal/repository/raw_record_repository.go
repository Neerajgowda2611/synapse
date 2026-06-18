package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type RawRecordRepository struct {
	*BaseRepository[model.RawRecord]
}

func NewRawRecordRepository(db *gorm.DB) *RawRecordRepository {
	return &RawRecordRepository{BaseRepository: NewBaseRepository[model.RawRecord](db)}
}

func (r *RawRecordRepository) ListByInstitutionID(ctx context.Context, institutionID uuid.UUID, limit, offset int) ([]model.RawRecord, error) {
	return r.listBy(ctx, "institution_id = ?", []any{institutionID}, limit, offset)
}

func (r *RawRecordRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID, limit, offset int) ([]model.RawRecord, error) {
	return r.listBy(ctx, "data_source_id = ?", []any{dataSourceID}, limit, offset)
}

func (r *RawRecordRepository) ListBySyncJobID(ctx context.Context, syncJobID uuid.UUID, limit, offset int) ([]model.RawRecord, error) {
	return r.listBy(ctx, "sync_job_id = ?", []any{syncJobID}, limit, offset)
}

func (r *RawRecordRepository) ListByEntityType(ctx context.Context, dataSourceID uuid.UUID, entityType string, limit, offset int) ([]model.RawRecord, error) {
	return r.listBy(ctx, "data_source_id = ? AND entity_type = ?", []any{dataSourceID, entityType}, limit, offset)
}

type EntityTypeCount struct {
	EntityType string `json:"entity_type"`
	Count      int64  `json:"count"`
}

func (r *RawRecordRepository) CountByDataSourceID(ctx context.Context, dataSourceID uuid.UUID, entityType string) (int64, error) {
	query := r.dbWithContext(ctx).Model(&model.RawRecord{}).Where("data_source_id = ?", dataSourceID)
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *RawRecordRepository) EntityTypeCounts(ctx context.Context, dataSourceID uuid.UUID) ([]EntityTypeCount, error) {
	var counts []EntityTypeCount
	err := r.dbWithContext(ctx).
		Model(&model.RawRecord{}).
		Select("entity_type, COUNT(*) as count").
		Where("data_source_id = ?", dataSourceID).
		Group("entity_type").
		Order("entity_type ASC").
		Scan(&counts).Error
	if err != nil {
		return nil, err
	}
	return counts, nil
}

func (r *RawRecordRepository) ListFiltered(
	ctx context.Context,
	dataSourceID uuid.UUID,
	entityType string,
	limit, offset int,
) ([]model.RawRecord, error) {
	if entityType != "" {
		return r.ListByEntityType(ctx, dataSourceID, entityType, limit, offset)
	}
	return r.ListByDataSourceID(ctx, dataSourceID, limit, offset)
}

func (r *RawRecordRepository) GetByExternalID(ctx context.Context, dataSourceID uuid.UUID, entityType, externalID string) (*model.RawRecord, error) {
	var record model.RawRecord
	if err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND entity_type = ? AND external_id = ?", dataSourceID, entityType, externalID).
		Order("created_at DESC").
		First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *RawRecordRepository) listBy(ctx context.Context, condition string, args []any, limit, offset int) ([]model.RawRecord, error) {
	var records []model.RawRecord
	query := r.dbWithContext(ctx).Where(condition, args...).Order("created_at DESC")
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
