package store

import (
	"context"
	"fmt"
	"reflect"
	"slices"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const selectRoles = `SELECT ` + roleDocument + ` FROM core.role r WHERE r."workspaceId" = $1::uuid`

var (
	roleTextKeys = []string{"label", "description", "icon"}
	roleFlagKeys = []string{
		"canUpdateAllSettings", "canAccessAllTools", "canReadAllObjectRecords", "canUpdateAllObjectRecords",
		"canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords", "canBeAssignedToUsers", "canBeAssignedToAgents", "canBeAssignedToApiKeys",
	}
	errNotEditable = fmt.Errorf("%w: this role cannot be modified because it is a system role", ErrForbidden)
)

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
		return nil, fmt.Errorf("find acting roles: %w", err)
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("read acting roles: %w", err)
	}
	return ids, nil
}

func (r *Roles) Create(ctx context.Context, rawInput Input) (Role, error) {
	input, _ := deep(rawInput).(Input)
	label, _ := collapseWhitespace(input["label"]).(string)
	if label == "" {
		return Role{}, fmt.Errorf("%w: label is required for role", metadata.ErrInvalidInput)
	}
	id, _ := collapseWhitespace(input["id"]).(string)
	flags := map[string]bool{"canBeAssignedToUsers": true, "canBeAssignedToAgents": true, "canBeAssignedToApiKeys": true}
	for _, key := range roleFlagKeys {
		if value, ok := input[key].(bool); ok {
			flags[key] = value
		}
	}
	if err := checkReadWrite(flags); err != nil {
		return Role{}, err
	}
	var created string
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if err := ensureLabelFree(ctx, tx, label, ""); err != nil {
			return err
		}
		return tx.QueryRow(ctx, `INSERT INTO core.role (id, label, description, icon, "canUpdateAllSettings", "canAccessAllTools", "canReadAllObjectRecords",
				"canUpdateAllObjectRecords", "canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords", "canBeAssignedToUsers", "canBeAssignedToAgents",
				"canBeAssignedToApiKeys", "workspaceId", "universalIdentifier", "applicationId")
			VALUES (COALESCE(NULLIF($1, '')::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::uuid, gen_random_uuid(),
				(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $14::uuid))
			RETURNING id::text`,
			id, label, collapseWhitespace(input["description"]), collapseWhitespace(input["icon"]),
			flags["canUpdateAllSettings"], flags["canAccessAllTools"], flags["canReadAllObjectRecords"], flags["canUpdateAllObjectRecords"],
			flags["canSoftDeleteAllObjectRecords"], flags["canDestroyAllObjectRecords"], flags["canBeAssignedToUsers"], flags["canBeAssignedToAgents"],
			flags["canBeAssignedToApiKeys"], workspace.PinnedWorkspaceID).Scan(&created)
	})
	if err != nil {
		return Role{}, fmt.Errorf("create role: %w", err)
	}
	return r.Get(ctx, created)
}

func (r *Roles) Update(ctx context.Context, actingRoleIDs []string, rawInput Input) (Role, error) {
	input, _ := deep(rawInput).(Input)
	id, _ := input["id"].(string)
	updates, _ := input["update"].(Input)
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := getRoleForUpdate(ctx, tx, id)
		if err != nil {
			return err
		}
		revokesOwnSettings := updates["canUpdateAllSettings"] == false && role.CanUpdateAllSettings && role.IsEditable && slices.Contains(actingRoleIDs, role.ID)
		if revokesOwnSettings {
			hasRoles, err := roleHasFlag(ctx, tx, role.ID, FlagRoles)
			if err != nil {
				return err
			}
			if !hasRoles {
				return fmt.Errorf("%w: you cannot remove your own access to settings", ErrForbidden)
			}
		}
		if !role.IsEditable {
			return errNotEditable
		}
		args := []any{id, workspace.PinnedWorkspaceID}
		var assignments []string
		set := func(column string, value any) {
			args = append(args, value)
			assignments = append(assignments, `"`+column+`" = $`+strconv.Itoa(len(args)))
		}
		merged := role.flags()
		for _, key := range roleFlagKeys {
			if value, ok := updates[key].(bool); ok {
				merged[key] = value
				set(key, value)
			}
		}
		for _, key := range roleTextKeys {
			text, ok := collapseWhitespace(updates[key]).(string)
			if !ok {
				continue
			}
			if key == "label" {
				if text == "" {
					return fmt.Errorf("%w: label is required for role", metadata.ErrInvalidInput)
				}
				if text != role.Label {
					if err := ensureLabelFree(ctx, tx, text, role.ID); err != nil {
						return err
					}
				}
			}
			set(key, text)
		}
		if err := checkReadWrite(merged); err != nil {
			return err
		}
		if len(assignments) == 0 {
			return nil
		}
		_, err = tx.Exec(ctx, `UPDATE core.role SET `+strings.Join(assignments, ", ")+`, "updatedAt" = now() WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, args...)
		return err
	})
	if err != nil {
		return Role{}, err
	}
	return r.Get(ctx, id)
}

func (r *Roles) Delete(ctx context.Context, actingRoleIDs []string, id string) (string, error) {
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := getRoleForUpdate(ctx, tx, id)
		if err != nil {
			return err
		}
		switch {
		case !role.IsEditable:
			return errNotEditable
		case slices.Contains(actingRoleIDs, role.ID):
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
		defaultRole, err := getRole(ctx, tx, *defaultRoleID)
		if err != nil {
			return err
		}
		for _, target := range []struct {
			column, kind string
			assignable   bool
		}{{"apiKeyId", "API key", defaultRole.CanBeAssignedToAPIKeys}, {"agentId", "agent", defaultRole.CanBeAssignedToAgents}} {
			var count int
			if err := tx.QueryRow(ctx, `SELECT count(*) FROM core."roleTarget" WHERE "roleId" = $1::uuid AND "`+target.column+`" IS NOT NULL`, id).Scan(&count); err != nil {
				return fmt.Errorf("count role targets: %w", err)
			}
			if count > 0 && !target.assignable {
				return fmt.Errorf("%w: cannot delete role %q: the workspace default role cannot be assigned to %ss", metadata.ErrInvalidInput, role.Label, target.kind)
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE core."roleTarget" SET "roleId" = $2::uuid, "updatedAt" = now() WHERE "roleId" = $1::uuid`, id, *defaultRoleID); err != nil {
			return fmt.Errorf("rebind role targets: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM core.role WHERE id = $1::uuid`, id); err != nil {
			return fmt.Errorf("delete role: %w", err)
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return id, nil
}

func (role Role) flags() map[string]bool {
	return map[string]bool{
		"canUpdateAllSettings": role.CanUpdateAllSettings, "canAccessAllTools": role.CanAccessAllTools,
		"canReadAllObjectRecords": role.CanReadAllObjectRecords, "canUpdateAllObjectRecords": role.CanUpdateAllObjectRecords,
		"canSoftDeleteAllObjectRecords": role.CanSoftDeleteAllObjectRecords, "canDestroyAllObjectRecords": role.CanDestroyAllObjectRecords,
		"canBeAssignedToUsers": role.CanBeAssignedToUsers, "canBeAssignedToAgents": role.CanBeAssignedToAgents, "canBeAssignedToApiKeys": role.CanBeAssignedToAPIKeys,
	}
}

func getRole(ctx context.Context, conn db, id string) (Role, error) {
	return queryOne[Role](ctx, conn, "role not found", selectRoles+` AND r.id = $2::uuid`, workspace.PinnedWorkspaceID, id)
}

func getRoleForUpdate(ctx context.Context, conn db, id string) (Role, error) {
	return queryOne[Role](ctx, conn, "role not found", selectRoles+` AND r.id = $2::uuid FOR UPDATE OF r`, workspace.PinnedWorkspaceID, id)
}

func roleHasFlag(ctx context.Context, conn db, roleID, flag string) (bool, error) {
	keys, err := queryAll[string](ctx, conn, `SELECT to_jsonb(pf.key) FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		WHERE rpf."roleId" = $1::uuid`, roleID)
	return slices.Contains(keys, flag), err
}

func ensureLabelFree(ctx context.Context, conn db, label, exceptRoleID string) error {
	taken, err := queryAll[string](ctx, conn, `SELECT to_jsonb(r.id) FROM core.role r
		WHERE r."workspaceId" = $1::uuid AND r.label = $2 AND r.id IS DISTINCT FROM NULLIF($3, '')::uuid`, workspace.PinnedWorkspaceID, label, exceptRoleID)
	if err != nil {
		return err
	}
	if len(taken) > 0 {
		return fmt.Errorf("%w: a role with this label already exists", metadata.ErrInvalidInput)
	}
	return nil
}

func checkReadWrite(flags map[string]bool) error {
	writes := flags["canUpdateAllObjectRecords"] || flags["canSoftDeleteAllObjectRecords"] || flags["canDestroyAllObjectRecords"]
	if !flags["canReadAllObjectRecords"] && writes {
		return fmt.Errorf("%w: you cannot grant edit permissions without also granting read permissions", metadata.ErrInvalidInput)
	}
	return nil
}

func deep(value any) any {
	reflected := reflect.ValueOf(value)
	switch reflected.Kind() {
	case reflect.Pointer:
		if reflected.IsNil() {
			return nil
		}
		return deep(reflected.Elem().Interface())
	case reflect.Slice:
		items := make([]any, reflected.Len())
		for i := range items {
			items[i] = deep(reflected.Index(i).Interface())
		}
		return items
	case reflect.Map:
		unwrapped := make(Input, reflected.Len())
		for _, key := range reflected.MapKeys() {
			unwrapped[key.String()] = deep(reflected.MapIndex(key).Interface())
		}
		return unwrapped
	}
	return value
}
