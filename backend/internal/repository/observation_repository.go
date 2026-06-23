package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ObservationRepository struct {
	*BaseRepository[model.Observation]
}

func NewObservationRepository(db *gorm.DB) *ObservationRepository {
	return &ObservationRepository{BaseRepository: NewBaseRepository[model.Observation](db)}
}

func (r *ObservationRepository) GetByIdempotencyKey(ctx context.Context, dataSourceID uuid.UUID, key string) (*model.Observation, error) {
	var obs model.Observation
	err := r.dbWithContext(ctx).
		Where("data_source_id = ? AND idempotency_key = ?", dataSourceID, key).
		First(&obs).Error
	if err != nil {
		return nil, err
	}
	return &obs, nil
}

func (r *ObservationRepository) ListByDataSourceID(ctx context.Context, dataSourceID uuid.UUID, limit, offset int) ([]model.Observation, error) {
	return r.listBy(ctx, "data_source_id = ?", []any{dataSourceID}, limit, offset)
}

func (r *ObservationRepository) ListBySourceEventType(ctx context.Context, dataSourceID uuid.UUID, sourceEventType string, limit, offset int) ([]model.Observation, error) {
	return r.listBy(ctx, "data_source_id = ? AND source_event_type = ?", []any{dataSourceID, sourceEventType}, limit, offset)
}

type SourceEventTypeCount struct {
	SourceEventType string `json:"source_event_type"`
	Count           int64  `json:"count"`
}

func (r *ObservationRepository) CountByDataSourceID(ctx context.Context, dataSourceID uuid.UUID, sourceEventType string) (int64, error) {
	query := r.dbWithContext(ctx).Model(&model.Observation{}).Where("data_source_id = ?", dataSourceID)
	if sourceEventType != "" {
		query = query.Where("source_event_type = ?", sourceEventType)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *ObservationRepository) SourceEventTypeCounts(ctx context.Context, dataSourceID uuid.UUID) ([]SourceEventTypeCount, error) {
	var counts []SourceEventTypeCount
	err := r.dbWithContext(ctx).
		Model(&model.Observation{}).
		Select("source_event_type, COUNT(*) as count").
		Where("data_source_id = ?", dataSourceID).
		Group("source_event_type").
		Order("source_event_type ASC").
		Scan(&counts).Error
	if err != nil {
		return nil, err
	}
	return counts, nil
}

func (r *ObservationRepository) ListFiltered(
	ctx context.Context,
	dataSourceID uuid.UUID,
	sourceEventType string,
	limit, offset int,
) ([]model.Observation, error) {
	if sourceEventType != "" {
		return r.ListBySourceEventType(ctx, dataSourceID, sourceEventType, limit, offset)
	}
	return r.ListByDataSourceID(ctx, dataSourceID, limit, offset)
}

func (r *ObservationRepository) listBy(ctx context.Context, condition string, args []any, limit, offset int) ([]model.Observation, error) {
	var observations []model.Observation
	query := r.dbWithContext(ctx).Where(condition, args...).Order("received_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Find(&observations).Error; err != nil {
		return nil, err
	}
	return observations, nil
}
