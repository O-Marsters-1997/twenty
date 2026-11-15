package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	FlagAPIKeysAndWebhooks = "API_KEYS_AND_WEBHOOKS"
	FlagRoles              = "ROLES"
	FlagWorkspaceMembers   = "WORKSPACE_MEMBERS"
)

type Permissions struct {
	pool *pgxpool.Pool
}

func NewPermissions(pool *pgxpool.Pool) *Permissions {
	return &Permissions{pool: pool}
}

func (p *Permissions) Has(ctx context.Context, principal auth.Principal, flag string) (bool, error) {
	var allowed bool
	err := p.pool.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."workspaceId" = $1::uuid
			AND (rt."userWorkspaceId" = NULLIF($2, '')::uuid OR rt."apiKeyId" = NULLIF($3, '')::uuid)
			AND (r."canUpdateAllSettings" OR EXISTS (
				SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
				WHERE rpf."roleId" = r.id AND pf.key = $4)))`,
		workspace.PinnedWorkspaceID, principal.UserWorkspaceID, principal.APIKeyID, flag).Scan(&allowed)
	if err != nil {
		return false, fmt.Errorf("check permission: %w", err)
	}
	return allowed, nil
}
