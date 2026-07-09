package xint

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
	ErrUserNotFound      = errors.New("xint user not found")
	ErrMissingAuthxSub   = errors.New("xint user missing authx_sub")
	ErrIdentifierMissing = errors.New("xint identifier is required")
)

// ResolvedUser is the normalized xint identity view returned by resolve endpoints.
type ResolvedUser struct {
	UserID        uuid.UUID  `json:"user_id"`
	AuthxSubject  *string    `json:"authx_subject,omitempty"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	InstitutionID *uuid.UUID `json:"institution_id,omitempty"`
}

type Resolver struct {
	userRepo *repository.UserRepository
}

func NewResolver(userRepo *repository.UserRepository) *Resolver {
	return &Resolver{userRepo: userRepo}
}

func (r *Resolver) ResolveLocalUserByAuthxSubject(ctx context.Context, authxSubject string) (*ResolvedUser, error) {
	authxSubject = strings.TrimSpace(authxSubject)
	if authxSubject == "" {
		return nil, ErrIdentifierMissing
	}
	user, roles, err := r.userRepo.GetWithRolesByAuthxSub(ctx, authxSubject)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return toResolvedUser(user, roles), nil
}

func (r *Resolver) ResolveLocalUserByEmail(ctx context.Context, email string) (*ResolvedUser, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, ErrIdentifierMissing
	}
	user, roles, err := r.userRepo.GetWithRolesByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return toResolvedUser(user, roles), nil
}

func (r *Resolver) ResolveAuthxSubjectByUserID(ctx context.Context, userID uuid.UUID) (string, error) {
	user, _, err := r.userRepo.GetWithRolesByID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrUserNotFound
		}
		return "", err
	}
	if user.AuthxSub == nil || strings.TrimSpace(*user.AuthxSub) == "" {
		return "", ErrMissingAuthxSub
	}
	return strings.TrimSpace(*user.AuthxSub), nil
}

func toResolvedUser(user *model.User, roles []model.UserRole) *ResolvedUser {
	var institutionID *uuid.UUID
	for _, role := range roles {
		if role.InstitutionID != nil {
			institutionID = role.InstitutionID
			break
		}
	}
	return &ResolvedUser{
		UserID:        user.ID,
		AuthxSubject:  user.AuthxSub,
		Email:         user.Email,
		Name:          user.Name,
		InstitutionID: institutionID,
	}
}
