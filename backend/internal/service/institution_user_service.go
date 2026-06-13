package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
)

var (
	ErrInvalidInstitutionUser    = errors.New("invalid institution user input")
	ErrInstitutionUserEmailTaken = errors.New("email already registered in this institution")
)

type CreateInstitutionUserInput struct {
	InstitutionID uuid.UUID
	Name          string
	Email         string
	Role          string
}

type InstitutionUserService struct {
	repo *repository.InstitutionUserRepository
}

func NewInstitutionUserService(repo *repository.InstitutionUserRepository) *InstitutionUserService {
	return &InstitutionUserService{repo: repo}
}

func (s *InstitutionUserService) Create(ctx context.Context, input CreateInstitutionUserInput) (*model.InstitutionUser, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	role := strings.TrimSpace(input.Role)

	if name == "" || email == "" || role == "" {
		return nil, ErrInvalidInstitutionUser
	}

	if !isValidRole(role) {
		return nil, ErrInvalidInstitutionUser
	}

	// Check email uniqueness within this institution
	if existing, _ := s.repo.GetByEmail(ctx, email); existing != nil && existing.InstitutionID == input.InstitutionID {
		return nil, ErrInstitutionUserEmailTaken
	}

	user := &model.InstitutionUser{
		InstitutionID: input.InstitutionID,
		Name:          name,
		Email:         email,
		Role:          role,
		Status:        "active",
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *InstitutionUserService) ListByInstitution(ctx context.Context, institutionID uuid.UUID) ([]model.InstitutionUser, error) {
	return s.repo.ListByInstitutionID(ctx, institutionID)
}

func isValidRole(role string) bool {
	valid := map[string]bool{
		"institution_admin":    true,
		"institution_operator": true,
		"institution_viewer":   true,
	}
	return valid[role]
}
