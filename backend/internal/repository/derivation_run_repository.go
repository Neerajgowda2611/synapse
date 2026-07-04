package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type DerivationRunRepository struct {
	*BaseRepository[model.DerivationRun]
}

func NewDerivationRunRepository(db *gorm.DB) *DerivationRunRepository {
	return &DerivationRunRepository{BaseRepository: NewBaseRepository[model.DerivationRun](db)}
}
