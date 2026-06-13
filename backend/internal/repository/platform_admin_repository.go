package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type PlatformAdminRepository struct {
	*BaseRepository[model.PlatformAdmin]
}

func NewPlatformAdminRepository(db *gorm.DB) *PlatformAdminRepository {
	return &PlatformAdminRepository{BaseRepository: NewBaseRepository[model.PlatformAdmin](db)}
}

func (r *PlatformAdminRepository) GetByZitadelSub(ctx context.Context, sub string) (*model.PlatformAdmin, error) {
	var admin model.PlatformAdmin
	if err := r.dbWithContext(ctx).First(&admin, "zitadel_sub = ?", sub).Error; err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *PlatformAdminRepository) GetByEmail(ctx context.Context, email string) (*model.PlatformAdmin, error) {
	var admin model.PlatformAdmin
	if err := r.dbWithContext(ctx).First(&admin, "email = ?", email).Error; err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *PlatformAdminRepository) LinkZitadelSub(ctx context.Context, id uuid.UUID, sub string) error {
	return r.dbWithContext(ctx).
		Model(&model.PlatformAdmin{}).
		Where("id = ?", id).
		Update("zitadel_sub", sub).Error
}
