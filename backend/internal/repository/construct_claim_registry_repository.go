package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConstructClaimRegistryRepository struct {
	*BaseRepository[model.ConstructClaimRegistry]
}

func NewConstructClaimRegistryRepository(db *gorm.DB) *ConstructClaimRegistryRepository {
	return &ConstructClaimRegistryRepository{BaseRepository: NewBaseRepository[model.ConstructClaimRegistry](db)}
}
