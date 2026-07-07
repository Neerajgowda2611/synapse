package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
)

// ErrAuthxSubMismatch indicates the profiler user is already linked to a different AuthX sub.
var ErrAuthxSubMismatch = errors.New("authx sub mismatch")

// EnsureAuthxUser resolves an AuthX-authenticated user to a profiler users row.
//
// Lookup order:
//  1. Match by authx_sub → return.
//  2. Match by email:
//     - if the row has no authx_sub → stamp it.
//     - if the row already links to a different sub → ErrAuthxSubMismatch.
//  3. No row found → JIT-create a users row + a `learner` user_roles row (institution = nil).
//
// The profiler users.id is auto-generated (uuid_generate_v4). The AuthX sub is
// stored in authx_sub. If the JIT-created user has no matching institution yet,
// they land as a learner with global scope until an admin adjusts their role.
func EnsureAuthxUser(ctx context.Context, userRepo *repository.UserRepository, claims *AuthxIDTokenClaims) (*model.User, []model.UserRole, error) {
	if user, roles, err := userRepo.GetWithRolesByAuthxSub(ctx, claims.Sub); err == nil {
		if len(roles) == 0 {
			return jitCreateLearnerRole(ctx, userRepo, user)
		}
		return user, roles, nil
	}

	if claims.Email == "" {
		return nil, nil, fmt.Errorf("%w: authx id_token missing email", ErrUserNotProvisioned)
	}

	user, roles, err := userRepo.GetWithRolesByEmail(ctx, claims.Email)
	if err == nil {
		if user.AuthxSub != nil && *user.AuthxSub != claims.Sub {
			return nil, nil, fmt.Errorf("%w: existing=%s incoming=%s", ErrAuthxSubMismatch, *user.AuthxSub, claims.Sub)
		}
		if user.AuthxSub == nil {
			if err := userRepo.LinkAuthxSub(ctx, user.ID, claims.Sub); err != nil {
				return nil, nil, fmt.Errorf("link authx_sub: %w", err)
			}
			sub := claims.Sub
			user.AuthxSub = &sub
		}
		if len(roles) == 0 {
			return jitCreateLearnerRole(ctx, userRepo, user)
		}
		return user, roles, nil
	}

	return jitCreateLearnerUser(ctx, userRepo, claims)
}

func jitCreateLearnerUser(
	ctx context.Context,
	userRepo *repository.UserRepository,
	claims *AuthxIDTokenClaims,
) (*model.User, []model.UserRole, error) {
	sub := claims.Sub
	name := claims.Name
	if name == "" {
		name = claims.Email
	}
	user := &model.User{
		ID:       uuid.New(),
		AuthxSub: &sub,
		Email:    claims.Email,
		Name:     name,
		Status:   "active",
	}
	role := &model.UserRole{
		ID:     uuid.New(),
		Role:   RoleLearner,
		Status: "active",
	}
	if err := userRepo.CreateAuthxUserWithRole(ctx, user, role); err != nil {
		return nil, nil, fmt.Errorf("jit-create user: %w", err)
	}
	return user, []model.UserRole{*role}, nil
}

func jitCreateLearnerRole(
	ctx context.Context,
	userRepo *repository.UserRepository,
	user *model.User,
) (*model.User, []model.UserRole, error) {
	role := &model.UserRole{
		ID:     uuid.New(),
		UserID: user.ID,
		Role:   RoleLearner,
		Status: "active",
	}
	if err := userRepo.AddRole(ctx, role); err != nil {
		return nil, nil, fmt.Errorf("jit-create role: %w", err)
	}
	return user, []model.UserRole{*role}, nil
}
