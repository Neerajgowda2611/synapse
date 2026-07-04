package repository

import (
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

type ConstructRegisterRepository struct {
	*BaseRepository[model.ConstructRegister]
}

func NewConstructRegisterRepository(db *gorm.DB) *ConstructRegisterRepository {
	return &ConstructRegisterRepository{BaseRepository: NewBaseRepository[model.ConstructRegister](db)}
}
