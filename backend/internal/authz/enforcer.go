package authz

import (
	"fmt"

	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

// rbacModel is the Casbin model for domain-based RBAC.
// sub = user UUID, dom = institution UUID (or "*"), obj = resource, act = action.
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
m = (g(r.sub, p.sub, r.dom) || g(r.sub, p.sub, "*")) && (r.dom == p.dom || p.dom == "*") && r.obj == p.obj && r.act == p.act
`

// NewEnforcer creates a Casbin enforcer backed by the Postgres DB (gorm-adapter).
// It seeds default role policies on every startup.
func NewEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
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
