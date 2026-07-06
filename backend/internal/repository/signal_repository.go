package repository

import (
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type SignalRepository struct {
	*BaseRepository[model.Signal]
}

func NewSignalRepository(db *gorm.DB) *SignalRepository {
	return &SignalRepository{BaseRepository: NewBaseRepository[model.Signal](db)}
}

func (r *SignalRepository) CreateBatch(ctx context.Context, signals []model.Signal) error {
	if len(signals) == 0 {
		return nil
	}
	return r.dbWithContext(ctx).Create(&signals).Error
}

func (r *SignalRepository) ListByUserBefore(ctx context.Context, userID uuid.UUID, asOf time.Time) ([]model.Signal, error) {
	var rows []model.Signal
	err := r.dbWithContext(ctx).
		Where("user_id = ? AND derived_at <= ?", userID, asOf).
		Order("derived_at DESC, created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SignalRepository) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]model.Signal, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []model.Signal
	err := r.dbWithContext(ctx).
		Where("id IN ?", ids).
		Order("derived_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SignalRepository) DedupeLatestBySignalType(rows []model.Signal) []model.Signal {
	if len(rows) == 0 {
		return nil
	}
	latest := make(map[string]model.Signal, len(rows))
	for _, row := range rows {
		existing, ok := latest[row.SignalType]
		if !ok || row.DerivedAt.After(existing.DerivedAt) || (row.DerivedAt.Equal(existing.DerivedAt) && row.CreatedAt.After(existing.CreatedAt)) {
			latest[row.SignalType] = row
		}
	}
	out := make([]model.Signal, 0, len(latest))
	for _, row := range latest {
		out = append(out, row)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DerivedAt.Equal(out[j].DerivedAt) {
			return out[i].SignalType < out[j].SignalType
		}
		return out[i].DerivedAt.After(out[j].DerivedAt)
	})
	return out
}
