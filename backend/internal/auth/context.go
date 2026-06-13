package auth

import (
	"context"

	"github.com/google/uuid"
)

type UserType string

const (
	UserTypePlatform    UserType = "platform"
	UserTypeInstitution UserType = "institution"
	UserTypeLearner     UserType = "learner"
)

type AuthContext struct {
	UserID        uuid.UUID
	ZitadelSub    string
	Email         string
	Name          string
	UserType      UserType
	Role          string
	InstitutionID *uuid.UUID
	LearnerID     *uuid.UUID
}

// Domain returns the Casbin domain for this user.
// Platform users use "*" (global); all others scope to their institution.
func (a *AuthContext) Domain() string {
	if a.InstitutionID != nil {
		return a.InstitutionID.String()
	}
	return "*"
}

type contextKey string

const authContextKey contextKey = "auth"

func ToContext(ctx context.Context, ac *AuthContext) context.Context {
	return context.WithValue(ctx, authContextKey, ac)
}

func FromContext(ctx context.Context) *AuthContext {
	ac, _ := ctx.Value(authContextKey).(*AuthContext)
	return ac
}
