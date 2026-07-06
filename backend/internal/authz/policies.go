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
	ResourceJobs         = "jobs"
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
		{auth.RolePlatformAdmin, "*", ResourceJobs, ActionRead},
		{auth.RolePlatformAdmin, "*", ResourceProfile, ActionRead},

		// Platform viewer — read-only globally
		{auth.RolePlatformViewer, "*", ResourceInstitutions, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceDataSources, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceUsers, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceConnectors, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceJobs, ActionRead},
		{auth.RolePlatformViewer, "*", ResourceProfile, ActionRead},

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
		{auth.RoleInstitutionAdmin, "*", ResourceJobs, ActionRead},
		{auth.RoleInstitutionAdmin, "*", ResourceProfile, ActionRead},

		// Institution operator — data operations, no user management
		{auth.RoleInstitutionOperator, "*", ResourceDataSources, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceSyncJobs, ActionCreate},
		{auth.RoleInstitutionOperator, "*", ResourceSyncJobs, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceMappings, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceJobs, ActionRead},
		{auth.RoleInstitutionOperator, "*", ResourceProfile, ActionRead},

		// Institution viewer — read-only
		{auth.RoleInstitutionViewer, "*", ResourceDataSources, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceUsers, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceSyncJobs, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceMappings, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceJobs, ActionRead},
		{auth.RoleInstitutionViewer, "*", ResourceProfile, ActionRead},

		// Learner — own profile only (handler must also enforce user_id == ctx.UserID)
		{auth.RoleLearner, "*", ResourceProfile, ActionRead},
		{auth.RoleLearner, "*", ResourceJobs, ActionRead},
	}

	for _, p := range policies {
		if _, err := e.AddPolicy(p[0], p[1], p[2], p[3]); err != nil {
			return err
		}
	}

	return e.SavePolicy()
}

func roleDomains(institutionID *string) []string {
	if institutionID != nil && *institutionID != "" {
		return []string{*institutionID, "*"}
	}
	return []string{"*"}
}

func assignRoleInDomains(e *casbin.Enforcer, userID, role, institutionID string) error {
	domains := roleDomains(nil)
	if institutionID != "" && institutionID != "*" {
		domains = roleDomains(&institutionID)
	}
	seen := make(map[string]struct{}, len(domains))
	for _, domain := range domains {
		if _, ok := seen[domain]; ok {
			continue
		}
		seen[domain] = struct{}{}
		if _, err := e.AddRoleForUserInDomain(userID, role, domain); err != nil {
			return err
		}
	}
	return nil
}

// AssignRole adds Casbin g rules for a user in their institution domain and globally.
func AssignRole(e *casbin.Enforcer, userID, role, domain string) error {
	if err := assignRoleInDomains(e, userID, role, domain); err != nil {
		return err
	}
	return e.SavePolicy()
}

// RemoveRole removes a g rule for a user in a domain.
func RemoveRole(e *casbin.Enforcer, userID, role, domain string) error {
	_, err := e.DeleteRoleForUserInDomain(userID, role, domain)
	return err
}

// SyncRolesFromDB rebuilds Casbin G-rules from user_roles on startup.
// It replaces all grouping policies so stale roles (e.g. after a role change in
// SQL) cannot linger and cause authorization mismatches.
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

	grouping, err := e.GetGroupingPolicy()
	if err != nil {
		return err
	}
	for _, rule := range grouping {
		if len(rule) < 3 {
			continue
		}
		if _, err := e.RemoveGroupingPolicy(rule[0], rule[1], rule[2]); err != nil {
			return err
		}
	}

	for _, r := range rows {
		institutionID := ""
		if r.InstitutionID != nil {
			institutionID = *r.InstitutionID
		}
		if err := assignRoleInDomains(e, r.UserID, r.Role, institutionID); err != nil {
			return err
		}
	}

	return e.SavePolicy()
}

// EnsureUserRoles idempotently syncs Casbin g rules for the authenticated user.
// Called on each request so role assignments stay aligned with user_roles.
func EnsureUserRoles(e *casbin.Enforcer, ac *auth.AuthContext) error {
	institutionID := ""
	if ac.InstitutionID != nil {
		institutionID = ac.InstitutionID.String()
	}
	if err := assignRoleInDomains(e, ac.UserID.String(), ac.Role, institutionID); err != nil {
		return err
	}
	return e.SavePolicy()
}
