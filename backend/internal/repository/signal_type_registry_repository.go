package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type SignalTypeRegistryRepository struct {
	*BaseRepository[model.SignalTypeRegistry]
}

func NewSignalTypeRegistryRepository(db *gorm.DB) *SignalTypeRegistryRepository {
	return &SignalTypeRegistryRepository{BaseRepository: NewBaseRepository[model.SignalTypeRegistry](db)}
}
