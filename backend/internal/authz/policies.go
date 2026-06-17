package authz

import (
	"github.com/casbin/casbin/v3"
	"github.com/profiler/backend/internal/auth"
	"gorm.io/gorm"
)

// Resources
const (
	ResourceInstitutions = "institutions"
	ResourceDataSources  = "data_sources"
	ResourceUsers        = "users"
	ResourceProfile      = "profile"
	ResourceConnectors   = "connectors"
	ResourceSyncJobs     = "sync_jobs"
	ResourceMappings     = "mappings"
)

// Actions
const (
	ActionCreate = "create"
	ActionRead   = "read"
	ActionUpdate = "update"
	ActionDelete = "delete"
)

// seedPolicies adds default role-based policies (p rules) on startup.
// These define what each role is allowed to do; user-role assignments (g rules)
// are added at user provisioning/login time.
func seedPolicies(e *casbin.Enforcer) error {
	policies := [][]string{
		// Platform admin — full access globally
		{auth.RolePlatformAdmin, "*", ResourceInstitutions, ActionCreate},
		{auth.RolePlatformAdmin, "*", ResourceInstitutions, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceInstitutions, ActionUpdate},
		{auth.RolePlatformAdmin, "*", ResourceDataSources, ActionCreate},
		{auth.RolePlatformAdmin, "*", ResourceDataSources, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceDataSources, ActionUpdate},
		{auth.RolePlatformAdmin, "*", ResourceUsers, ActionCreate},
		{auth.RolePlatformAdmin, "*", ResourceUsers, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceUsers, ActionUpdate},
		{auth.RolePlatformAdmin, "*", ResourceConnectors, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceSyncJobs, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceMappings, ActionRead},

		// Platform viewer — read-only globally
		{auth.RolePlatformViewer, "*", ResourceInstitutions, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceDataSources, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceUsers, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceConnectors, ActionRead},

		// Institution admin — full access within their institution domain
		{auth.RoleInstitutionAdmin, "*", ResourceDataSources, ActionCreate},
		{auth.RoleInstitutionAdmin, "*", ResourceDataSources, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceDataSources, ActionUpdate},
		{auth.RoleInstitutionAdmin, "*", ResourceUsers, ActionCreate},
		{auth.RoleInstitutionAdmin, "*", ResourceUsers, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceUsers, ActionUpdate},
		{auth.RoleInstitutionAdmin, "*", ResourceConnectors, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceSyncJobs, ActionCreate},
		{auth.RoleInstitutionAdmin, "*", ResourceSyncJobs, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceMappings, ActionCreate},
		{auth.RoleInstitutionAdmin, "*", ResourceMappings, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceMappings, ActionUpdate},

		// Institution operator — data operations, no user management
		{auth.RoleInstitutionOperator, "*", ResourceDataSources, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceSyncJobs, ActionCreate},
		{auth.RoleInstitutionOperator, "*", ResourceSyncJobs, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceMappings, ActionRead},

		// Institution viewer — read-only
		{auth.RoleInstitutionViewer, "*", ResourceDataSources, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceUsers, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceSyncJobs, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceMappings, ActionRead},

		// Learner — own profile only (handler must also enforce learner_id == ctx.LearnerID)
		{auth.RoleLearner, "*", ResourceProfile, ActionRead},
	}

	for _, p := range policies {
		if _, err := e.AddPolicy(p[0], p[1], p[2], p[3]); err != nil {
			return err
		}
	}

	return e.SavePolicy()
}

// AssignRole adds a g rule: user has role in domain.
// Call this when a user is added to an institution or promoted.
func AssignRole(e *casbin.Enforcer, userID, role, domain string) error {
	_, err := e.AddRoleForUserInDomain(userID, role, domain)
	return err
}

// RemoveRole removes a g rule for a user in a domain.
func RemoveRole(e *casbin.Enforcer, userID, role, domain string) error {
	_, err := e.DeleteRoleForUserInDomain(userID, role, domain)
	return err
}

// SyncRolesFromDB reads every active row from user_roles and ensures a matching
// Casbin G-rule exists. It is idempotent and should be called once at startup
// so manually seeded or backfilled users are immediately authorised.
func SyncRolesFromDB(db *gorm.DB, e *casbin.Enforcer) error {
	var rows []struct {
		UserID        string  `gorm:"column:user_id"`
		Role          string  `gorm:"column:role"`
		InstitutionID *string `gorm:"column:institution_id"`
	}

	if err := db.Raw(`
		SELECT user_id::text, role, institution_id::text
		FROM user_roles
		WHERE status = 'active'
	`).Scan(&rows).Error; err != nil {
		return err
	}

	for _, r := range rows {
		domain := "*"
		if r.InstitutionID != nil && *r.InstitutionID != "" {
			domain = *r.InstitutionID
		}
		if _, err := e.AddRoleForUserInDomain(r.UserID, r.Role, domain); err != nil {
			return err
		}
	}

	return e.SavePolicy()
}
