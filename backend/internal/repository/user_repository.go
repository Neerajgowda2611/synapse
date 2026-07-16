package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

// UserRepository handles all reads and writes for the unified users / user_roles tables.
type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) dbCtx(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx)
}

// GetWithRolesByZitadelSub returns the user and all their active roles.
func (r *UserRepository) GetWithRolesByZitadelSub(ctx context.Context, sub string) (*model.User, []model.UserRole, error) {
	var user model.User
	err := r.dbCtx(ctx).
		Preload("Roles", "status = ?", "active").
		Where("zitadel_sub = ?", sub).
		First(&user).Error
	if err != nil {
		return nil, nil, err
	}
	return &user, user.Roles, nil
}

// GetWithRolesByAuthxSub returns the user and all their active roles matched on the AuthX sub claim.
func (r *UserRepository) GetWithRolesByAuthxSub(ctx context.Context, sub string) (*model.User, []model.UserRole, error) {
	var user model.User
	err := r.dbCtx(ctx).
		Preload("Roles", "status = ?", "active").
		Where("authx_sub = ?", sub).
		First(&user).Error
	if err != nil {
		return nil, nil, err
	}
	return &user, user.Roles, nil
}

// GetWithRolesByID returns the user and all their active roles by primary key.
func (r *UserRepository) GetWithRolesByID(ctx context.Context, id uuid.UUID) (*model.User, []model.UserRole, error) {
	var user model.User
	err := r.dbCtx(ctx).
		Preload("Roles", "status = ?", "active").
		Where("id = ?", id).
		First(&user).Error
	if err != nil {
		return nil, nil, err
	}
	return &user, user.Roles, nil
}

// LinkAuthxSub stamps authx_sub onto an existing user row (first-login provisioning).
func (r *UserRepository) LinkAuthxSub(ctx context.Context, userID uuid.UUID, sub string) error {
	return r.dbCtx(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"authx_sub":  sub,
			"updated_at": time.Now(),
		}).Error
}

// CreateAuthxUserWithRole inserts a users row and a single user_roles row atomically.
// Used for AuthX JIT-provisioning when the user hasn't been pre-created by an admin.
func (r *UserRepository) CreateAuthxUserWithRole(ctx context.Context, user *model.User, role *model.UserRole) error {
	return r.dbCtx(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		role.UserID = user.ID
		return tx.Create(role).Error
	})
}

// AddRole inserts a single user_roles row for an existing user.
func (r *UserRepository) AddRole(ctx context.Context, role *model.UserRole) error {
	return r.dbCtx(ctx).Create(role).Error
}

// GetWithRolesByEmail returns the user and all their active roles.
func (r *UserRepository) GetWithRolesByEmail(ctx context.Context, email string) (*model.User, []model.UserRole, error) {
	var user model.User
	err := r.dbCtx(ctx).
		Preload("Roles", "status = ?", "active").
		Where("email = ?", email).
		First(&user).Error
	if err != nil {
		return nil, nil, err
	}
	return &user, user.Roles, nil
}

// LinkZitadelSub sets zitadel_sub on an existing user row (JIT provisioning).
func (r *UserRepository) LinkZitadelSub(ctx context.Context, userID uuid.UUID, sub string) error {
	return r.dbCtx(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"zitadel_sub": sub,
			"updated_at":  time.Now(),
		}).Error
}

// CreateWithRole creates a new user and their first role inside a transaction.
// If a user with that email already exists the role is added to the existing user.
// Returns the persisted User and UserRole.
func (r *UserRepository) CreateWithRole(ctx context.Context, user *model.User, role *model.UserRole) error {
	return r.dbCtx(ctx).Transaction(func(tx *gorm.DB) error {
		var existing model.User
		err := tx.Where("email = ?", user.Email).First(&existing).Error
		switch {
		case err == nil:
			// User already exists — reuse the ID and refresh the name.
			user.ID = existing.ID
			if err := tx.Model(&existing).Updates(map[string]any{
				"name":       user.Name,
				"updated_at": time.Now(),
			}).Error; err != nil {
				return err
			}
		case errors.Is(err, gorm.ErrRecordNotFound):
			if err := tx.Create(user).Error; err != nil {
				return err
			}
		default:
			return err
		}

		role.UserID = user.ID
		return tx.Create(role).Error
	})
}

// BackfillUser is called by the resolver when a user is found in a legacy table
// but not yet in the new users/user_roles tables. It is best-effort: a failure
// is logged but does not abort the request.
func (r *UserRepository) BackfillUser(ctx context.Context, user *model.User, role *model.UserRole) error {
	return r.dbCtx(ctx).Transaction(func(tx *gorm.DB) error {
		var existing model.User
		err := tx.Where("email = ?", user.Email).First(&existing).Error
		switch {
		case err == nil:
			user.ID = existing.ID
			// Patch sub if it's now known.
			if user.ZitadelSub != nil && existing.ZitadelSub == nil {
				if err := tx.Model(&existing).Updates(map[string]any{
					"zitadel_sub": user.ZitadelSub,
					"updated_at":  time.Now(),
				}).Error; err != nil {
					return err
				}
			}
		case errors.Is(err, gorm.ErrRecordNotFound):
			if err := tx.Create(user).Error; err != nil {
				return err
			}
		default:
			return err
		}

		if role == nil {
			return nil
		}

		role.UserID = user.ID
		// Ignore duplicate-key errors — role may already exist from the batch backfill.
		if err := tx.Create(role).Error; err != nil {
			if IsDuplicateKey(err) {
				return nil
			}
			return err
		}
		return nil
	})
}

// ListByInstitutionID returns all active user_roles for an institution,
// preloading the associated User.
func (r *UserRepository) ListByInstitutionID(ctx context.Context, institutionID uuid.UUID) ([]model.UserRole, error) {
	var roles []model.UserRole
	err := r.dbCtx(ctx).
		Preload("User").
		Where("institution_id = ? AND status = ?", institutionID, "active").
		Order("created_at DESC").
		Find(&roles).Error
	return roles, err
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	if err := r.dbCtx(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	if err := r.dbCtx(ctx).First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ListByEmails(ctx context.Context, emails []string) ([]model.User, error) {
	normalized := make([]string, 0, len(emails))
	seen := make(map[string]struct{}, len(emails))
	for _, email := range emails {
		cleaned := strings.ToLower(strings.TrimSpace(email))
		if cleaned == "" {
			continue
		}
		if _, exists := seen[cleaned]; exists {
			continue
		}
		seen[cleaned] = struct{}{}
		normalized = append(normalized, cleaned)
	}
	if len(normalized) == 0 {
		return []model.User{}, nil
	}

	var users []model.User
	if err := r.dbCtx(ctx).Where("lower(email) IN ?", normalized).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	return r.dbCtx(ctx).Create(user).Error
}

// IsDuplicateKey detects Postgres unique-constraint violation errors.
func IsDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "23505")
}
