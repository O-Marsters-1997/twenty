package store

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var objectPermissionKeys = []string{"canReadObjectRecords", "canUpdateObjectRecords", "canSoftDeleteObjectRecords", "canDestroyObjectRecords"}

type tristate struct {
	value *bool
	set   bool
}

func (t tristate) orElse(current *bool) *bool {
	if t.set {
		return t.value
	}
	return current
}

func triOf(input Input, key string) tristate {
	value, set := input[key]
	flag, isBool := value.(bool)
	if !isBool {
		return tristate{set: set}
	}
	return tristate{value: &flag, set: true}
}

func sameFlag(a, b *bool) bool {
	return (a == nil && b == nil) || (a != nil && b != nil && *a == *b)
}

func existingFlag(row Input, key string) *bool {
	if flag, ok := row[key].(bool); ok {
		return &flag
	}
	return nil
}

func inputItems(value any) []Input {
	var items []Input
	list, _ := value.([]any)
	for _, item := range list {
		if entry, ok := item.(Input); ok {
			items = append(items, entry)
		}
	}
	return items
}

func editableRole(ctx context.Context, tx pgx.Tx, input Input) (Role, error) {
	roleID, _ := input["roleId"].(string)
	role, err := getRoleForUpdate(ctx, tx, roleID)
	switch {
	case err != nil:
		return Role{}, err
	case !role.IsEditable:
		return Role{}, errNotEditable
	}
	var foreign bool
	if err := tx.QueryRow(ctx, `SELECT r."applicationId" IS DISTINCT FROM w."workspaceCustomApplicationId" FROM core.role r, core.workspace w
		WHERE r.id = $1::uuid AND w.id = $2::uuid`, role.ID, workspace.PinnedWorkspaceID).Scan(&foreign); err != nil {
		return Role{}, fmt.Errorf("check role application: %w", err)
	}
	if foreign {
		return Role{}, fmt.Errorf("%w: this role belongs to another application and cannot be modified here", ErrForbidden)
	}
	return role, nil
}

func idsOf(items []Input, key string) []string {
	var ids []string
	for _, item := range items {
		if id, ok := item[key].(string); ok && !slices.Contains(ids, id) {
			ids = append(ids, id)
		}
	}
	return ids
}

func ensureObjectsExist(ctx context.Context, tx pgx.Tx, ids []string) (map[string]bool, error) {
	type object struct {
		ID       string `json:"id"`
		IsSystem bool   `json:"isSystem"`
	}
	found, err := queryAll[object](ctx, tx, `SELECT jsonb_build_object('id', id, 'isSystem', "isSystem") FROM core."objectMetadata"
		WHERE "workspaceId" = $1::uuid AND id = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, ids)
	if err != nil {
		return nil, err
	}
	system := map[string]bool{}
	for _, item := range found {
		system[item.ID] = item.IsSystem
	}
	for _, id := range ids {
		if _, ok := system[id]; !ok {
			return nil, fmt.Errorf("%w: object metadata %s not found; it may have been deleted", metadata.ErrNotFound, id)
		}
	}
	return system, nil
}

func (r *Roles) UpsertObjectPermissions(ctx context.Context, rawInput Input) ([]ObjectPermission, error) {
	input, _ := deep(rawInput).(Input)
	desired := inputItems(input["objectPermissions"])
	if len(desired) == 0 {
		return nil, fmt.Errorf("%w: objectPermissions must not be empty", metadata.ErrInvalidInput)
	}
	objectIDs := idsOf(desired, "objectMetadataId")
	if len(objectIDs) != len(desired) {
		return nil, fmt.Errorf("%w: each object may appear only once in objectPermissions", metadata.ErrInvalidInput)
	}
	if err := requireUUIDs(objectIDs...); err != nil {
		return nil, err
	}
	var result []ObjectPermission
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := editableRole(ctx, tx, input)
		if err != nil {
			return err
		}
		currentRows, err := queryAll[Input](ctx, tx, selectObjectPermissions, role.ID)
		if err != nil {
			return err
		}
		current := map[string]Input{}
		for _, row := range currentRows {
			current[row["objectMetadataId"].(string)] = row
		}
		roleDefaults := map[string]bool{
			"canReadObjectRecords": role.CanReadAllObjectRecords, "canUpdateObjectRecords": role.CanUpdateAllObjectRecords,
			"canSoftDeleteObjectRecords": role.CanSoftDeleteAllObjectRecords, "canDestroyObjectRecords": role.CanDestroyAllObjectRecords,
		}
		effective := func(item Input, key string) *bool {
			return triOf(item, key).orElse(existingFlag(current[item["objectMetadataId"].(string)], key))
		}
		resolved := func(item Input, key string) bool {
			if value := effective(item, key); value != nil {
				return *value
			}
			return roleDefaults[key]
		}
		for _, item := range desired {
			if !resolved(item, "canReadObjectRecords") && (resolved(item, "canUpdateObjectRecords") || resolved(item, "canSoftDeleteObjectRecords") || resolved(item, "canDestroyObjectRecords")) {
				return fmt.Errorf("%w: you cannot grant edit permissions without also granting read permissions on an object", metadata.ErrInvalidInput)
			}
		}
		if _, err := ensureObjectsExist(ctx, tx, objectIDs); err != nil {
			return err
		}
		for _, item := range desired {
			objectID := item["objectMetadataId"].(string)
			values := make([]any, len(objectPermissionKeys))
			changed := false
			for i, key := range objectPermissionKeys {
				value := effective(item, key)
				if value != nil {
					values[i] = *value
				}
				changed = changed || !sameFlag(value, existingFlag(current[objectID], key))
			}
			switch _, exists := current[objectID]; {
			case !exists:
				_, err = tx.Exec(ctx, `INSERT INTO core."objectPermission" ("roleId", "objectMetadataId", "canReadObjectRecords", "canUpdateObjectRecords",
						"canSoftDeleteObjectRecords", "canDestroyObjectRecords", "workspaceId", "universalIdentifier", "applicationId")
					VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $7::uuid))`,
					append([]any{role.ID, objectID}, append(values, workspace.PinnedWorkspaceID)...)...)
			case changed:
				_, err = tx.Exec(ctx, `UPDATE core."objectPermission" SET "canReadObjectRecords" = $3, "canUpdateObjectRecords" = $4,
						"canSoftDeleteObjectRecords" = $5, "canDestroyObjectRecords" = $6, "updatedAt" = now()
					WHERE "roleId" = $1::uuid AND "objectMetadataId" = $2::uuid`, append([]any{role.ID, objectID}, values...)...)
			}
			if err != nil {
				return fmt.Errorf("write object permission: %w", err)
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM core."objectPermission" WHERE "roleId" = $1::uuid AND NOT ("objectMetadataId" = ANY($2::uuid[]))`, role.ID, objectIDs); err != nil {
			return fmt.Errorf("delete object permissions: %w", err)
		}
		result, err = queryAll[ObjectPermission](ctx, tx, selectObjectPermissions+` AND "objectMetadataId" = ANY($2::uuid[]) ORDER BY "createdAt", id`, role.ID, objectIDs)
		return err
	})
	return result, err
}

func (r *Roles) UpsertPermissionFlags(ctx context.Context, rawInput Input) ([]RolePermissionFlag, error) {
	input, _ := deep(rawInput).(Input)
	keyItems, _ := input["permissionFlagKeys"].([]any)
	keys := make([]string, len(keyItems))
	for i, item := range keyItems {
		keys[i], _ = item.(string)
	}
	var result []RolePermissionFlag
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := editableRole(ctx, tx, input)
		if err != nil {
			return err
		}
		known, err := queryAll[string](ctx, tx, `SELECT to_jsonb(key) FROM core."permissionFlag" WHERE "workspaceId" = $1::uuid AND key = ANY($2::text[])`, workspace.PinnedWorkspaceID, keys)
		if err != nil {
			return err
		}
		var unknown []string
		for _, key := range keys {
			if !slices.Contains(known, key) {
				unknown = append(unknown, key)
			}
		}
		if len(unknown) > 0 {
			return fmt.Errorf("%w: invalid permission flags: %s", metadata.ErrInvalidInput, strings.Join(unknown, ", "))
		}
		if _, err := tx.Exec(ctx, `DELETE FROM core."rolePermissionFlag" rpf USING core."permissionFlag" pf
			WHERE pf.id = rpf."permissionFlagId" AND rpf."roleId" = $1::uuid AND NOT (pf.key = ANY($2::text[]))`, role.ID, keys); err != nil {
			return fmt.Errorf("delete permission flags: %w", err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO core."rolePermissionFlag" ("roleId", "permissionFlagId", "workspaceId", "universalIdentifier", "applicationId")
			SELECT $1::uuid, pf.id, $3::uuid, gen_random_uuid(), `+customApplicationFor("$3")+` FROM core."permissionFlag" pf
			WHERE pf."workspaceId" = $3::uuid AND pf.key = ANY($2::text[])
				AND NOT EXISTS (SELECT 1 FROM core."rolePermissionFlag" existing WHERE existing."roleId" = $1::uuid AND existing."permissionFlagId" = pf.id)`,
			role.ID, keys, workspace.PinnedWorkspaceID); err != nil {
			return fmt.Errorf("insert permission flags: %w", err)
		}
		result, err = queryAll[RolePermissionFlag](ctx, tx, selectRoleFlags+` ORDER BY rpf."createdAt", rpf.id`, role.ID)
		return err
	})
	return result, err
}

func customApplicationFor(workspaceParameter string) string {
	return `(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = ` + workspaceParameter + `::uuid)`
}
