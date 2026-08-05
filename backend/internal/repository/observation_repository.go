package repository

import (
	"context"
	"strconv"
	"time"

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

func (r *ObservationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Observation, error) {
	var obs model.Observation
	if err := r.dbWithContext(ctx).First(&obs, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &obs, nil
}

func (r *ObservationRepository) MarkQuarantined(ctx context.Context, id uuid.UUID, reason string, shapeSignature *string) error {
	updates := map[string]any{
		"status":            model.ObservationStatusQuarantined,
		"quarantine_reason": reason,
	}
	if shapeSignature != nil {
		updates["shape_signature"] = *shapeSignature
	}
	return r.dbWithContext(ctx).Model(&model.Observation{}).Where("id = ?", id).Updates(updates).Error
}

func (r *ObservationRepository) MarkCanonicalized(ctx context.Context, id uuid.UUID, bindingID string, bindingVersion int, observationType string) error {
	return r.dbWithContext(ctx).Model(&model.Observation{}).Where("id = ?", id).Updates(map[string]any{
		"status":            model.ObservationStatusCanonicalized,
		"binding_id":        bindingID,
		"binding_version":   strconv.Itoa(bindingVersion),
		"observation_type":  observationType,
		"quarantine_reason": nil,
	}).Error
}

// ClaimForProcessing atomically moves one observation from received to processing.
func (r *ObservationRepository) ClaimForProcessing(ctx context.Context, id uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	result := r.dbWithContext(ctx).Model(&model.Observation{}).
		Where("id = ? AND status = ?", id, model.ObservationStatusReceived).
		Updates(map[string]any{
			"status":                model.ObservationStatusProcessing,
			"processing_started_at": now,
		})
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

// ClaimReceivedBatch claims up to limit received observations for background workers.
func (r *ObservationRepository) ClaimReceivedBatch(ctx context.Context, limit int) ([]uuid.UUID, error) {
	if limit <= 0 {
		return nil, nil
	}
	var ids []uuid.UUID
	err := r.dbWithContext(ctx).Raw(`
		WITH picked AS (
			SELECT id
			FROM observations
			WHERE status = ?
			ORDER BY received_at ASC
			LIMIT ?
			FOR UPDATE SKIP LOCKED
		)
		UPDATE observations AS o
		SET status = ?, processing_started_at = NOW()
		FROM picked
		WHERE o.id = picked.id
		RETURNING o.id
	`, model.ObservationStatusReceived, limit, model.ObservationStatusProcessing).Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	return ids, nil
}

// ReleaseStaleProcessing resets observations stuck in processing back to received.
func (r *ObservationRepository) ReleaseStaleProcessing(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().UTC().Add(-olderThan)
	result := r.dbWithContext(ctx).Model(&model.Observation{}).
		Where("status = ? AND processing_started_at IS NOT NULL AND processing_started_at < ?", model.ObservationStatusProcessing, cutoff).
		Updates(map[string]any{
			"status":                model.ObservationStatusReceived,
			"processing_started_at": nil,
		})
	return result.RowsAffected, result.Error
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

func (r *ObservationRepository) ListQuarantinedBySourceConnector(ctx context.Context, sourceConnector string) ([]model.Observation, error) {
	var observations []model.Observation
	err := r.dbWithContext(ctx).
		Where("source_connector = ? AND status IN ?", sourceConnector, []string{model.ObservationStatusQuarantined, model.ObservationStatusReceived}).
		Order("received_at ASC").
		Find(&observations).Error
	if err != nil {
		return nil, err
	}
	return observations, nil
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
	// Prefer created_at (actual ingest time). Seeded/demo rows often set
	// occurred_at/received_at to future event times, which buries real new events.
	query := r.dbWithContext(ctx).Where(condition, args...).Order("created_at DESC")
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
