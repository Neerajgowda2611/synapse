package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

var (
	ErrInstitutionNotFound = errors.New("institution not found")
	ErrInvalidInstitution  = errors.New("invalid institution input")
)

type CreateInstitutionInput struct {
	Name   string
	Type   *string
	Status string
}

type InstitutionService struct {
	repo *repository.InstitutionRepository
}

func NewInstitutionService(repo *repository.InstitutionRepository) *InstitutionService {
	return &InstitutionService{repo: repo}
}

func (s *InstitutionService) Create(ctx context.Context, input CreateInstitutionInput) (*model.Institution, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, ErrInvalidInstitution
	}

	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}

	institution := &model.Institution{
		Name:   name,
		Type:   input.Type,
		Status: status,
	}

	if err := s.repo.Create(ctx, institution); err != nil {
		return nil, err
	}

	return institution, nil
}

func (s *InstitutionService) List(ctx context.Context, status string, limit, offset int) ([]model.Institution, error) {
	if status != "" {
		return s.repo.ListByStatus(ctx, status, limit, offset)
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *InstitutionService) GetByID(ctx context.Context, id uuid.UUID) (*model.Institution, error) {
	institution, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInstitutionNotFound
		}
		return nil, err
	}
	return institution, nil
}
