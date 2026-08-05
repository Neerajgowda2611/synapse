package authz

import (
	"fmt"

	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

// rbacModel is role-based: sub is the role from user_roles (not a user id).
// Domains still scope requests; policies may use "*" for any domain.
//
// role_definition (g) is declared only because the gorm adapter may still load
// legacy grouping rows during startup; we do not use g() in the matcher and we
// delete those rows before serving traffic.
const rbacModel = `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && (r.dom == p.dom || p.dom == "*") && r.obj == p.obj && r.act == p.act
`

// NewEnforcer creates a Casbin enforcer backed by the Postgres DB (gorm-adapter).
// It stores only role→permission policies. User→role assignment lives in user_roles.
func NewEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
	// Remove legacy per-user grouping rows before LoadPolicy so startup does not
	// depend on them (and so we never enforce via user→role g rules).
	if err := db.Exec(`DELETE FROM casbin_rule WHERE ptype = 'g'`).Error; err != nil {
		return nil, fmt.Errorf("clearing grouping policies: %w", err)
	}

	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, fmt.Errorf("casbin gorm adapter: %w", err)
	}

	m, err := model.NewModelFromString(rbacModel)
	if err != nil {
		return nil, fmt.Errorf("casbin model: %w", err)
	}

	enforcer, err := casbin.NewEnforcer(m, adapter)
	if err != nil {
		return nil, fmt.Errorf("casbin enforcer: %w", err)
	}

	if err := seedPolicies(enforcer); err != nil {
		return nil, fmt.Errorf("seeding policies: %w", err)
	}

	return enforcer, nil
}
