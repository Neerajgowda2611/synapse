package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type CanonicalObservationRepository struct {
	*BaseRepository[model.CanonicalObservation]
}

func NewCanonicalObservationRepository(db *gorm.DB) *CanonicalObservationRepository {
	return &CanonicalObservationRepository{BaseRepository: NewBaseRepository[model.CanonicalObservation](db)}
}
