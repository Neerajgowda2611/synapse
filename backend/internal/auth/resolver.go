package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/profiler/backend/internal/repository"
)

var ErrUserNotProvisioned = errors.New("user not provisioned in profiler")

// Resolver maps a validated JWT Claims to an AuthContext by looking up
// the caller in platform_admins, institution_users, or learners.
// On first login it links zitadel_sub to an existing unlinked row (JIT provisioning).
type Resolver struct {
	platformAdminRepo   *repository.PlatformAdminRepository
	institutionUserRepo *repository.InstitutionUserRepository
	learnerRepo         *repository.LearnerRepository
}

func NewResolver(
	platformAdminRepo *repository.PlatformAdminRepository,
	institutionUserRepo *repository.InstitutionUserRepository,
	learnerRepo *repository.LearnerRepository,
) *Resolver {
	return &Resolver{
		platformAdminRepo:   platformAdminRepo,
		institutionUserRepo: institutionUserRepo,
		learnerRepo:         learnerRepo,
	}
}

func (r *Resolver) Resolve(ctx context.Context, claims *Claims) (*AuthContext, error) {
	// 1. Platform admin by sub
	if admin, err := r.platformAdminRepo.GetByZitadelSub(ctx, claims.Sub); err == nil {
		return &AuthContext{
			UserID:     admin.ID,
			ZitadelSub: claims.Sub,
			Email:      claims.Email,
			Name:       claims.Name,
			UserType:   UserTypePlatform,
			Role:       admin.Role,
		}, nil
	}

	// 2. Institution user by sub
	if user, err := r.institutionUserRepo.GetByZitadelSub(ctx, claims.Sub); err == nil {
		return &AuthContext{
			UserID:        user.ID,
			ZitadelSub:    claims.Sub,
			Email:         claims.Email,
			Name:          claims.Name,
			UserType:      UserTypeInstitution,
			Role:          user.Role,
			InstitutionID: &user.InstitutionID,
		}, nil
	}

	// 3. Learner by sub
	if learner, err := r.learnerRepo.GetByZitadelSub(ctx, claims.Sub); err == nil {
		return &AuthContext{
			UserID:        learner.ID,
			ZitadelSub:    claims.Sub,
			Email:         claims.Email,
			Name:          claims.Name,
			UserType:      UserTypeLearner,
			Role:          RoleLearner,
			InstitutionID: &learner.InstitutionID,
			LearnerID:     &learner.ID,
		}, nil
	}

	// 4. JIT provisioning: link sub to an existing unlinked row by verified email.
	if claims.EmailVerified && claims.Email != "" {
		if ac, err := r.jitLink(ctx, claims); err == nil {
			return ac, nil
		}
	}

	return nil, fmt.Errorf("%w: sub=%s email=%s", ErrUserNotProvisioned, claims.Sub, claims.Email)
}

func (r *Resolver) jitLink(ctx context.Context, claims *Claims) (*AuthContext, error) {
	// Try platform admin by email
	if admin, err := r.platformAdminRepo.GetByEmail(ctx, claims.Email); err == nil && admin.ZitadelSub == nil {
		if err := r.platformAdminRepo.LinkZitadelSub(ctx, admin.ID, claims.Sub); err != nil {
			return nil, err
		}
		admin.ZitadelSub = &claims.Sub
		return &AuthContext{
			UserID:     admin.ID,
			ZitadelSub: claims.Sub,
			Email:      claims.Email,
			Name:       claims.Name,
			UserType:   UserTypePlatform,
			Role:       admin.Role,
		}, nil
	}

	// Try institution user by email
	if user, err := r.institutionUserRepo.GetByEmail(ctx, claims.Email); err == nil && user.ZitadelSub == nil {
		if err := r.institutionUserRepo.LinkZitadelSub(ctx, user.ID, claims.Sub); err != nil {
			return nil, err
		}
		return &AuthContext{
			UserID:        user.ID,
			ZitadelSub:    claims.Sub,
			Email:         claims.Email,
			Name:          claims.Name,
			UserType:      UserTypeInstitution,
			Role:          user.Role,
			InstitutionID: &user.InstitutionID,
		}, nil
	}

	// Try learner by email
	if learner, err := r.learnerRepo.GetByEmail(ctx, claims.Email); err == nil && learner.ZitadelSub == nil {
		if err := r.learnerRepo.LinkZitadelSub(ctx, learner.ID, claims.Sub); err != nil {
			return nil, err
		}
		return &AuthContext{
			UserID:        learner.ID,
			ZitadelSub:    claims.Sub,
			Email:         claims.Email,
			Name:          claims.Name,
			UserType:      UserTypeLearner,
			Role:          RoleLearner,
			InstitutionID: &learner.InstitutionID,
			LearnerID:     &learner.ID,
		}, nil
	}

	return nil, ErrUserNotProvisioned
}
