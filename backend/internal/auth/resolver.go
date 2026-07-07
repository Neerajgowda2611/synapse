package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
)

var ErrUserNotProvisioned = errors.New("user not provisioned in profiler")

// Resolver maps a validated JWT Claims to an AuthContext via users + user_roles.
// On first login it links zitadel_sub to an existing unlinked row (JIT provisioning).
type Resolver struct {
	userRepo *repository.UserRepository
}

func NewResolver(userRepo *repository.UserRepository) *Resolver {
	return &Resolver{userRepo: userRepo}
}

func (r *Resolver) Resolve(ctx context.Context, claims *Claims) (*AuthContext, error) {
	// Profiler-minted access tokens carry the users.id in Sub — skip the IdP lookup entirely.
	if claims.ProfilerUserID != "" {
		userID, err := uuid.Parse(claims.ProfilerUserID)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid profiler user id", ErrUserNotProvisioned)
		}
		user, roles, err := r.userRepo.GetWithRolesByID(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("%w: id=%s", ErrUserNotProvisioned, claims.ProfilerUserID)
		}
		return buildAuthContext(user, roles)
	}

	if ac, err := r.resolveBySub(ctx, claims.Sub); err == nil {
		return ac, nil
	}

	if claims.EmailVerified && claims.Email != "" {
		if ac, err := r.jitLink(ctx, claims); err == nil {
			return ac, nil
		}
	}

	return nil, fmt.Errorf("%w: sub=%s email=%s", ErrUserNotProvisioned, claims.Sub, claims.Email)
}

func (r *Resolver) resolveBySub(ctx context.Context, sub string) (*AuthContext, error) {
	user, roles, err := r.userRepo.GetWithRolesByZitadelSub(ctx, sub)
	if err != nil {
		return nil, err
	}
	return buildAuthContext(user, roles)
}

func (r *Resolver) jitLink(ctx context.Context, claims *Claims) (*AuthContext, error) {
	user, roles, err := r.userRepo.GetWithRolesByEmail(ctx, claims.Email)
	if err != nil || user.ZitadelSub != nil {
		return nil, ErrUserNotProvisioned
	}

	if err := r.userRepo.LinkZitadelSub(ctx, user.ID, claims.Sub); err != nil {
		return nil, err
	}
	user.ZitadelSub = &claims.Sub
	return buildAuthContext(user, roles)
}

func buildAuthContext(user *model.User, roles []model.UserRole) (*AuthContext, error) {
	if len(roles) == 0 {
		return nil, ErrUserNotProvisioned
	}

	primary := pickPrimaryRole(roles)

	ac := &AuthContext{
		UserID:     user.ID,
		ZitadelSub: derefString(user.ZitadelSub),
		Email:      user.Email,
		Name:       user.Name,
		Role:       primary.Role,
	}

	switch {
	case isPlatformRole(primary.Role):
		ac.UserType = UserTypePlatform
	case isInstitutionRole(primary.Role):
		ac.UserType = UserTypeInstitution
		ac.InstitutionID = primary.InstitutionID
	default:
		ac.UserType = UserTypeLearner
		ac.InstitutionID = primary.InstitutionID
	}

	return ac, nil
}

func pickPrimaryRole(roles []model.UserRole) model.UserRole {
	for _, r := range roles {
		if isPlatformRole(r.Role) {
			return r
		}
	}
	for _, r := range roles {
		if isInstitutionRole(r.Role) {
			return r
		}
	}
	if len(roles) == 0 {
		return model.UserRole{Role: RoleLearner}
	}
	return roles[0]
}

func isPlatformRole(role string) bool {
	return role == RolePlatformAdmin || role == RolePlatformViewer
}

func isInstitutionRole(role string) bool {
	return role == RoleInstitutionAdmin || role == RoleInstitutionOperator || role == RoleInstitutionViewer
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
