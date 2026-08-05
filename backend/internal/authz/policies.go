package authz

import (
	"github.com/casbin/casbin/v3"
	"github.com/profiler/backend/internal/auth"
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

// seedPolicies adds default role→permission policies (p rules) on startup.
// User→role assignment is not stored in Casbin; it comes from user_roles at request time.
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

	changed := false
	for _, p := range policies {
		added, err := e.AddPolicy(p[0], p[1], p[2], p[3])
		if err != nil {
			return err
		}
		if added {
			changed = true
		}
	}

	if !changed {
		return nil
	}
	return e.SavePolicy()
}
