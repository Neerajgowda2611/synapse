package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SignalObservationRepository struct {
	*BaseRepository[model.SignalObservation]
}

func NewSignalObservationRepository(db *gorm.DB) *SignalObservationRepository {
	return &SignalObservationRepository{BaseRepository: NewBaseRepository[model.SignalObservation](db)}
}

func (r *SignalObservationRepository) CreateBatch(ctx context.Context, rows []model.SignalObservation) error {
	if len(rows) == 0 {
		return nil
	}
	return r.dbWithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "canonical_observation_id"}, {Name: "rule_id"}},
		DoNothing: true,
	}).Create(&rows).Error
}

func (r *SignalObservationRepository) ExistsByCanonicalAndRule(ctx context.Context, canonicalObservationID uuid.UUID, ruleID string) (bool, error) {
	var count int64
	err := r.dbWithContext(ctx).
		Model(&model.SignalObservation{}).
		Where("canonical_observation_id = ? AND rule_id = ?", canonicalObservationID, ruleID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
