package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type CanonicalObservationRepository struct {
	*BaseRepository[model.CanonicalObservation]
}

func NewCanonicalObservationRepository(db *gorm.DB) *CanonicalObservationRepository {
	return &CanonicalObservationRepository{BaseRepository: NewBaseRepository[model.CanonicalObservation](db)}
}

func (r *CanonicalObservationRepository) ListByUserBefore(ctx context.Context, userID uuid.UUID, asOf time.Time) ([]model.CanonicalObservation, error) {
	var rows []model.CanonicalObservation
	err := r.dbWithContext(ctx).
		Where("user_id = ? AND occurred_at <= ?", userID, asOf).
		Order("occurred_at ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *CanonicalObservationRepository) ListRecentUserIDs(ctx context.Context, since time.Time, limit int) ([]uuid.UUID, error) {
	if limit <= 0 {
		limit = 100
	}
	var ids []uuid.UUID
	err := r.dbWithContext(ctx).
		Model(&model.CanonicalObservation{}).
		Select("DISTINCT user_id").
		Where("created_at >= ?", since).
		Order("user_id").
		Limit(limit).
		Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	return ids, nil
}
