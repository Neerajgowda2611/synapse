package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseRepository[T any] struct {
	db *gorm.DB
}

func NewBaseRepository[T any](db *gorm.DB) *BaseRepository[T] {
	return &BaseRepository[T]{db: db}
}

func (r *BaseRepository[T]) Create(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

func (r *BaseRepository[T]) GetByID(ctx context.Context, id uuid.UUID, preloads ...string) (*T, error) {
	var entity T
	query := r.db.WithContext(ctx)
	for _, preload := range preloads {
		query = query.Preload(preload)
	}

	if err := query.First(&entity, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

func (r *BaseRepository[T]) List(ctx context.Context, limit, offset int, preloads ...string) ([]T, error) {
	var entities []T
	query := r.db.WithContext(ctx).Order("created_at DESC")
	for _, preload := range preloads {
		query = query.Preload(preload)
	}

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

func (r *BaseRepository[T]) Update(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

func (r *BaseRepository[T]) Delete(ctx context.Context, id uuid.UUID) error {
	var entity T
	return r.db.WithContext(ctx).Delete(&entity, "id = ?", id).Error
}

func (r *BaseRepository[T]) dbWithContext(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx)
}
