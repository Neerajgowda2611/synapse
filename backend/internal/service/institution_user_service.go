package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
)

var (
	ErrInvalidInstitutionUser    = errors.New("invalid institution user input")
	ErrInstitutionUserEmailTaken = errors.New("email already has this role in this institution")
)

// InstitutionUserView is the public-facing shape returned by this service.
// It mirrors the old model.InstitutionUser JSON shape so existing callers and
// the frontend keep working without changes.
type InstitutionUserView struct {
	ID            string    `json:"id"`
	InstitutionID string    `json:"institution_id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Role          string    `json:"role"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateInstitutionUserInput struct {
	InstitutionID uuid.UUID
	Name          string
	Email         string
	Role          string
}

type InstitutionUserService struct {
	userRepo *repository.UserRepository
}

func NewInstitutionUserService(userRepo *repository.UserRepository) *InstitutionUserService {
	return &InstitutionUserService{userRepo: userRepo}
}

// Create adds a user to an institution. If a users row for that email already
// exists it is reused; only the role assignment is new.
func (s *InstitutionUserService) Create(ctx context.Context, input CreateInstitutionUserInput) (*InstitutionUserView, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	role := strings.TrimSpace(input.Role)

	if name == "" || email == "" || role == "" {
		return nil, ErrInvalidInstitutionUser
	}
	if !isValidInstitutionRole(role) {
		return nil, ErrInvalidInstitutionUser
	}

	user := &model.User{
		Name:   name,
		Email:  email,
		Status: "active",
	}
	ur := &model.UserRole{
		Role:          role,
		InstitutionID: &input.InstitutionID,
		Status:        "active",
	}

	if err := s.userRepo.CreateWithRole(ctx, user, ur); err != nil {
		if repository.IsDuplicateKey(err) {
			return nil, ErrInstitutionUserEmailTaken
		}
		return nil, err
	}

	return &InstitutionUserView{
		ID:            ur.ID.String(),
		InstitutionID: input.InstitutionID.String(),
		Name:          user.Name,
		Email:         user.Email,
		Role:          ur.Role,
		Status:        ur.Status,
		CreatedAt:     ur.CreatedAt,
		UpdatedAt:     ur.UpdatedAt,
	}, nil
}

// ListByInstitution returns all active users for an institution.
func (s *InstitutionUserService) ListByInstitution(ctx context.Context, institutionID uuid.UUID) ([]InstitutionUserView, error) {
	roles, err := s.userRepo.ListByInstitutionID(ctx, institutionID)
	if err != nil {
		return nil, err
	}

	views := make([]InstitutionUserView, 0, len(roles))
	for _, ur := range roles {
		instID := ""
		if ur.InstitutionID != nil {
			instID = ur.InstitutionID.String()
		}
		views = append(views, InstitutionUserView{
			ID:            ur.ID.String(),
			InstitutionID: instID,
			Name:          ur.User.Name,
			Email:         ur.User.Email,
			Role:          ur.Role,
			Status:        ur.Status,
			CreatedAt:     ur.CreatedAt,
			UpdatedAt:     ur.UpdatedAt,
		})
	}
	return views, nil
}

func isValidInstitutionRole(role string) bool {
	switch role {
	case "institution_admin", "institution_operator", "institution_viewer":
		return true
	}
	return false
}
