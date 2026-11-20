package store

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const selectRoles = `SELECT ` + roleDocument + ` FROM core.role r WHERE r."workspaceId" = $1::uuid`

var roleFlags = []struct {
	key          string
	defaultsTrue bool
	field        func(*Role) *bool
}{
	{"canUpdateAllSettings", false, func(r *Role) *bool { return &r.CanUpdateAllSettings }},
	{"canAccessAllTools", false, func(r *Role) *bool { return &r.CanAccessAllTools }},
	{"canReadAllObjectRecords", false, func(r *Role) *bool { return &r.CanReadAllObjectRecords }},
	{"canUpdateAllObjectRecords", false, func(r *Role) *bool { return &r.CanUpdateAllObjectRecords }},
	{"canSoftDeleteAllObjectRecords", false, func(r *Role) *bool { return &r.CanSoftDeleteAllObjectRecords }},
	{"canDestroyAllObjectRecords", false, func(r *Role) *bool { return &r.CanDestroyAllObjectRecords }},
	{"canBeAssignedToUsers", true, func(r *Role) *bool { return &r.CanBeAssignedToUsers }},
	{"canBeAssignedToAgents", true, func(r *Role) *bool { return &r.CanBeAssignedToAgents }},
	{"canBeAssignedToApiKeys", true, func(r *Role) *bool { return &r.CanBeAssignedToAPIKeys }},
}

type Roles struct {
	pool *pgxpool.Pool
}

func NewRoles(pool *pgxpool.Pool) *Roles {
	return &Roles{pool: pool}
}

func (r *Roles) List(ctx context.Context) ([]Role, error) {
	return queryAll[Role](ctx, r.pool, selectRoles+` ORDER BY r."createdAt", r.id`, workspace.PinnedWorkspaceID)
}

func (r *Roles) Get(ctx context.Context, id string) (Role, error) {
	return getRole(ctx, r.pool, id)
}

func (r *Roles) ActingRoleIDs(ctx context.Context, userWorkspaceID string) ([]string, error) {
	if userWorkspaceID == "" {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx, `SELECT "roleId"::text FROM core."roleTarget" WHERE "userWorkspaceId" = $1::uuid AND "workspaceId" = $2::uuid`,
		userWorkspaceID, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query acting roles: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

func (r *Roles) Create(ctx context.Context, rawInput Input) (Role, error) {
	input := plain(rawInput)
	role := Role{
		Label:       tidy(input["label"]),
		Description: tidyOptional(input["description"]),
		Icon:        tidyOptional(input["icon"]),
		IsEditable:  true,
	}
	if role.Label == "" {
		return Role{}, fmt.Errorf("%w: label is required", metadata.ErrInvalidInput)
	}
	for _, flag := range roleFlags {
		value, present := input[flag.key].(bool)
		if !present {
			value = flag.defaultsTrue
		}
		*flag.field(&role) = value
	}
	if err := validateReadWrite(role); err != nil {
		return Role{}, err
	}
	id, _ := input["id"].(string)
	var created string
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if err := ensureLabelFree(ctx, tx, role.Label, ""); err != nil {
			return err
		}
		err := tx.QueryRow(ctx, `INSERT INTO core.role (id, label, description, icon, "canUpdateAllSettings", "canAccessAllTools", "canReadAllObjectRecords",
				"canUpdateAllObjectRecords", "canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords", "canBeAssignedToUsers", "canBeAssignedToAgents",
				"canBeAssignedToApiKeys", "isEditable", "workspaceId", "universalIdentifier", "applicationId")
			VALUES (COALESCE(NULLIF($1, '')::uuid, public.uuid_generate_v4()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14::uuid, gen_random_uuid(),
				(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $14::uuid))
			RETURNING id::text`,
			id, role.Label, role.Description, role.Icon, role.CanUpdateAllSettings, role.CanAccessAllTools, role.CanReadAllObjectRecords,
			role.CanUpdateAllObjectRecords, role.CanSoftDeleteAllObjectRecords, role.CanDestroyAllObjectRecords, role.CanBeAssignedToUsers,
			role.CanBeAssignedToAgents, role.CanBeAssignedToAPIKeys, workspace.PinnedWorkspaceID).Scan(&created)
		if err != nil {
			return fmt.Errorf("insert role: %w", err)
		}
		return nil
	})
	if err != nil {
		return Role{}, err
	}
	return r.Get(ctx, created)
}

func (r *Roles) Update(ctx context.Context, id string, rawUpdates Input, actingRoleIDs []string) (Role, error) {
	updates := plain(rawUpdates)
	var updated Role
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := getRole(ctx, tx, id)
		if err != nil {
			return err
		}
		if err := requireEditable(role); err != nil {
			return err
		}
		if value, present := updates["canUpdateAllSettings"]; present && value == false && role.CanUpdateAllSettings && slices.Contains(actingRoleIDs, role.ID) {
			holdsRoles, err := roleHoldsFlag(ctx, tx, role.ID, FlagRoles)
			if err != nil {
				return err
			}
			if !holdsRoles {
				return fmt.Errorf("%w: you cannot revoke your own access to settings", ErrForbidden)
			}
		}
		if value, present := updates["label"]; present {
			label, isText := value.(string)
			if !isText {
				return fmt.Errorf("%w: label is required", metadata.ErrInvalidInput)
			}
			role.Label = label
			if err := ensureLabelFree(ctx, tx, role.Label, role.ID); err != nil {
				return err
			}
		}
		for key, target := range map[string]**string{"description": &role.Description, "icon": &role.Icon} {
			if value, present := updates[key]; present {
				text, isText := value.(string)
				*target = nil
				if isText {
					*target = &text
				}
			}
		}
		for _, flag := range roleFlags {
			value, present := updates[flag.key]
			if !present {
				continue
			}
			boolean, isBoolean := value.(bool)
			if !isBoolean {
				return fmt.Errorf("%w: %s must be a boolean", metadata.ErrInvalidInput, flag.key)
			}
			*flag.field(&role) = boolean
		}
		if err := validateReadWrite(role); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE core.role SET label = $2, description = $3, icon = $4, "canUpdateAllSettings" = $5, "canAccessAllTools" = $6,
				"canReadAllObjectRecords" = $7, "canUpdateAllObjectRecords" = $8, "canSoftDeleteAllObjectRecords" = $9, "canDestroyAllObjectRecords" = $10,
				"canBeAssignedToUsers" = $11, "canBeAssignedToAgents" = $12, "canBeAssignedToApiKeys" = $13, "updatedAt" = now()
			WHERE id = $1::uuid AND "workspaceId" = $14::uuid`,
			role.ID, role.Label, role.Description, role.Icon, role.CanUpdateAllSettings, role.CanAccessAllTools, role.CanReadAllObjectRecords,
			role.CanUpdateAllObjectRecords, role.CanSoftDeleteAllObjectRecords, role.CanDestroyAllObjectRecords, role.CanBeAssignedToUsers,
			role.CanBeAssignedToAgents, role.CanBeAssignedToAPIKeys, workspace.PinnedWorkspaceID)
		if err != nil {
			return fmt.Errorf("update role: %w", err)
		}
		updated, err = getRole(ctx, tx, id)
		return err
	})
	return updated, err
}

func (r *Roles) Delete(ctx context.Context, id string, actingRoleIDs []string) (string, error) {
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := getRole(ctx, tx, id)
		if err != nil {
			return err
		}
		if role.IsEditable && slices.Contains(actingRoleIDs, role.ID) {
			return fmt.Errorf("%w: you cannot delete your own role", ErrForbidden)
		}
		var defaultRoleID *string
		if err := tx.QueryRow(ctx, `SELECT "defaultRoleId"::text FROM core.workspace WHERE id = $1::uuid`, workspace.PinnedWorkspaceID).Scan(&defaultRoleID); err != nil {
			return fmt.Errorf("find default role: %w", err)
		}
		switch {
		case defaultRoleID == nil:
			return fmt.Errorf("%w: the default role for this workspace could not be found", metadata.ErrNotFound)
		case *defaultRoleID == id:
			return fmt.Errorf("%w: the default role cannot be deleted", ErrForbidden)
		}
		if err := requireEditable(role); err != nil {
			return err
		}
		defaultRole, err := getRole(ctx, tx, *defaultRoleID)
		if err != nil {
			return err
		}
		for _, target := range []struct {
			column     string
			assignable bool
			noun       string
		}{
			{"apiKeyId", defaultRole.CanBeAssignedToAPIKeys, "API key"},
			{"agentId", defaultRole.CanBeAssignedToAgents, "agent"},
		} {
			if target.assignable {
				continue
			}
			rows, err := tx.Query(ctx, `SELECT EXISTS (SELECT 1 FROM core."roleTarget" WHERE "roleId" = $1::uuid AND "`+target.column+`" IS NOT NULL)`, id)
			if err != nil {
				return fmt.Errorf("find %s role targets: %w", target.noun, err)
			}
			assigned, err := pgx.CollectOneRow(rows, pgx.RowTo[bool])
			switch {
			case err != nil:
				return fmt.Errorf("find %s role targets: %w", target.noun, err)
			case assigned:
				return fmt.Errorf("%w: cannot delete role %q: the workspace default role cannot be assigned to %ss", metadata.ErrInvalidInput, role.Label, target.noun)
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE core."roleTarget" SET "roleId" = $2::uuid, "updatedAt" = now() WHERE "roleId" = $1::uuid`, id, *defaultRoleID); err != nil {
			return fmt.Errorf("rebind role targets: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM core.role WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID); err != nil {
			return fmt.Errorf("delete role: %w", err)
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return id, nil
}

func getRole(ctx context.Context, conn db, id string) (Role, error) {
	return queryOne[Role](ctx, conn, "Role not found", selectRoles+` AND r.id = $2::uuid`, workspace.PinnedWorkspaceID, id)
}

func requireEditable(role Role) error {
	if !role.IsEditable {
		return fmt.Errorf("%w: this role cannot be modified because it is a system role", ErrForbidden)
	}
	return nil
}

func validateReadWrite(role Role) error {
	if !role.CanReadAllObjectRecords && (role.CanUpdateAllObjectRecords || role.CanSoftDeleteAllObjectRecords || role.CanDestroyAllObjectRecords) {
		return fmt.Errorf("%w: you cannot grant edit permissions without also granting read permissions", metadata.ErrInvalidInput)
	}
	return nil
}

func ensureLabelFree(ctx context.Context, conn db, label, exceptRoleID string) error {
	taken, err := queryBool(ctx, conn, `SELECT EXISTS (SELECT 1 FROM core.role WHERE "workspaceId" = $1::uuid AND label = $2 AND id::text <> $3)`,
		workspace.PinnedWorkspaceID, label, exceptRoleID)
	switch {
	case err != nil:
		return fmt.Errorf("check role label: %w", err)
	case taken:
		return fmt.Errorf("%w: a role with this label already exists", metadata.ErrInvalidInput)
	}
	return nil
}

func roleHoldsFlag(ctx context.Context, conn db, roleID, flag string) (bool, error) {
	return queryBool(ctx, conn, `SELECT EXISTS (SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		WHERE rpf."roleId" = $1::uuid AND pf.key = $2)`, roleID, flag)
}

func queryBool(ctx context.Context, conn db, statement string, args ...any) (bool, error) {
	rows, err := conn.Query(ctx, statement, args...)
	if err != nil {
		return false, err
	}
	return pgx.CollectOneRow(rows, pgx.RowTo[bool])
}

func tidy(value any) string {
	text, _ := value.(string)
	return strings.Join(strings.Fields(text), " ")
}

func tidyOptional(value any) *string {
	if value == nil {
		return nil
	}
	text := tidy(value)
	return &text
}
