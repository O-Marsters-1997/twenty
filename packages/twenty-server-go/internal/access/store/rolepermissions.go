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

const customApplication = `(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $1::uuid)`

type optionalBool struct {
	present bool
	value   *bool
}

func optionalBoolOf(input Input, key string) optionalBool {
	value, present := input[key]
	if !present {
		return optionalBool{}
	}
	boolean, isBoolean := value.(bool)
	if !isBoolean {
		return optionalBool{present: true}
	}
	return optionalBool{present: true, value: &boolean}
}

func (o optionalBool) or(current *bool) *bool {
	if o.present {
		return o.value
	}
	return current
}

func sameBool(a, b *bool) bool {
	return (a == nil && b == nil) || (a != nil && b != nil && *a == *b)
}

func editableRole(ctx context.Context, tx pgx.Tx, roleID string) (Role, error) {
	role, err := getRole(ctx, tx, roleID)
	if err != nil {
		return Role{}, err
	}
	return role, requireEditable(role)
}

func (r *Roles) UpsertObjectPermissions(ctx context.Context, roleID string, rawInputs []Input) ([]ObjectPermission, error) {
	var result []ObjectPermission
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := editableRole(ctx, tx, roleID)
		if err != nil {
			return err
		}
		desired := map[string]Input{}
		for _, raw := range rawInputs {
			input := plain(raw)
			objectID, _ := input["objectMetadataId"].(string)
			desired[objectID] = input
		}
		objectIDs := make([]string, 0, len(desired))
		for objectID := range desired {
			objectIDs = append(objectIDs, objectID)
		}
		found, err := queryAll[string](ctx, tx, `SELECT to_jsonb(id::text) FROM core."objectMetadata" WHERE "workspaceId" = $1::uuid AND id = ANY($2::uuid[])`,
			workspace.PinnedWorkspaceID, objectIDs)
		if err != nil {
			return err
		}
		if len(found) != len(objectIDs) {
			return fmt.Errorf("%w: object metadata id not found", metadata.ErrNotFound)
		}
		current := map[string]ObjectPermission{}
		existing, err := queryAll[ObjectPermission](ctx, tx, selectObjectPermissions, workspace.PinnedWorkspaceID, roleID)
		if err != nil {
			return err
		}
		for _, permission := range existing {
			current[permission.ObjectMetadataID] = permission
		}

		for objectID, input := range desired {
			now := current[objectID]
			read := optionalBoolOf(input, "canReadObjectRecords").or(now.CanReadObjectRecords)
			update := optionalBoolOf(input, "canUpdateObjectRecords").or(now.CanUpdateObjectRecords)
			softDelete := optionalBoolOf(input, "canSoftDeleteObjectRecords").or(now.CanSoftDeleteObjectRecords)
			destroy := optionalBoolOf(input, "canDestroyObjectRecords").or(now.CanDestroyObjectRecords)
			if !resolveFlag(read, role.CanReadAllObjectRecords) &&
				(resolveFlag(update, role.CanUpdateAllObjectRecords) || resolveFlag(softDelete, role.CanSoftDeleteAllObjectRecords) || resolveFlag(destroy, role.CanDestroyAllObjectRecords)) {
				return fmt.Errorf("%w: you cannot grant edit permissions on an object without also granting read permission", metadata.ErrInvalidInput)
			}
			if _, exists := current[objectID]; !exists {
				_, err = tx.Exec(ctx, `INSERT INTO core."objectPermission" ("roleId", "objectMetadataId", "canReadObjectRecords", "canUpdateObjectRecords",
						"canSoftDeleteObjectRecords", "canDestroyObjectRecords", "workspaceId", "universalIdentifier", "applicationId")
					VALUES ($2::uuid, $3::uuid, $4, $5, $6, $7, $1::uuid, gen_random_uuid(), `+customApplication+`)`,
					workspace.PinnedWorkspaceID, roleID, objectID, read, update, softDelete, destroy)
			} else {
				_, err = tx.Exec(ctx, `UPDATE core."objectPermission" SET "canReadObjectRecords" = $4, "canUpdateObjectRecords" = $5,
						"canSoftDeleteObjectRecords" = $6, "canDestroyObjectRecords" = $7, "updatedAt" = now()
					WHERE "workspaceId" = $1::uuid AND "roleId" = $2::uuid AND "objectMetadataId" = $3::uuid`,
					workspace.PinnedWorkspaceID, roleID, objectID, read, update, softDelete, destroy)
			}
			if err != nil {
				return fmt.Errorf("write object permission: %w", err)
			}
		}
		for objectID := range current {
			if _, kept := desired[objectID]; kept {
				continue
			}
			if _, err := tx.Exec(ctx, `DELETE FROM core."objectPermission" WHERE "workspaceId" = $1::uuid AND "roleId" = $2::uuid AND "objectMetadataId" = $3::uuid`,
				workspace.PinnedWorkspaceID, roleID, objectID); err != nil {
				return fmt.Errorf("delete object permission: %w", err)
			}
		}
		result, err = queryAll[ObjectPermission](ctx, tx, selectObjectPermissions+` AND op."objectMetadataId" = ANY($3::uuid[]) ORDER BY op."createdAt", op.id`,
			workspace.PinnedWorkspaceID, roleID, objectIDs)
		return err
	})
	return result, err
}

func resolveFlag(value *bool, roleDefault bool) bool {
	if value == nil {
		return roleDefault
	}
	return *value
}

type fieldChange struct {
	objectID, fieldID string
	read, update      optionalBool
}

func (c fieldChange) key() string { return c.objectID + ":" + c.fieldID }

type fieldMetadata struct {
	ID             string  `json:"id"`
	ObjectID       string  `json:"objectMetadataId"`
	Type           string  `json:"type"`
	RelationType   *string `json:"relationType"`
	TargetObjectID *string `json:"targetObjectId"`
	TargetFieldID  *string `json:"targetFieldId"`
	ObjectIsSystem bool    `json:"objectIsSystem"`
}

type fieldPermissionRow struct {
	FieldPermission
	ApplicationID string `json:"applicationId"`
}

func (r *Roles) UpsertFieldPermissions(ctx context.Context, roleID string, rawInputs []Input) ([]FieldPermission, error) {
	var result []FieldPermission
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		if _, err := editableRole(ctx, tx, roleID); err != nil {
			return err
		}
		inputs := make([]fieldChange, len(rawInputs))
		fieldIDs := make([]string, len(rawInputs))
		for i, raw := range rawInputs {
			input := plain(raw)
			inputs[i].objectID, _ = input["objectMetadataId"].(string)
			inputs[i].fieldID, _ = input["fieldMetadataId"].(string)
			inputs[i].read = optionalBoolOf(input, "canReadFieldValue")
			inputs[i].update = optionalBoolOf(input, "canUpdateFieldValue")
			fieldIDs[i] = inputs[i].fieldID
		}
		fields, err := queryAll[fieldMetadata](ctx, tx, `SELECT jsonb_build_object('id', f.id, 'objectMetadataId', f."objectMetadataId", 'type', f.type,
				'relationType', f.settings ->> 'relationType', 'targetObjectId', f."relationTargetObjectMetadataId", 'targetFieldId', f."relationTargetFieldMetadataId",
				'objectIsSystem', o."isSystem")
			FROM core."fieldMetadata" f JOIN core."objectMetadata" o ON o.id = f."objectMetadataId"
			WHERE f."workspaceId" = $1::uuid AND f.id = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, fieldIDs)
		if err != nil {
			return err
		}
		fieldByID := map[string]fieldMetadata{}
		for _, field := range fields {
			fieldByID[field.ID] = field
		}

		desired := map[string]fieldChange{}
		inputKeys := map[string]fieldChange{}
		seenFields := map[string]bool{}
		for _, change := range inputs {
			if seenFields[change.fieldID] {
				return fmt.Errorf("%w: cannot accept more than one fieldPermission for field %s in input", metadata.ErrInvalidInput, change.fieldID)
			}
			seenFields[change.fieldID] = true
			if (change.read.value != nil && *change.read.value) || (change.update.value != nil && *change.update.value) {
				return fmt.Errorf("%w: field permissions can only be used to restrict access, not to grant additional permissions", metadata.ErrInvalidInput)
			}
			field, known := fieldByID[change.fieldID]
			switch {
			case !known:
				return fmt.Errorf("%w: field metadata not found", metadata.ErrNotFound)
			case field.ObjectIsSystem:
				return fmt.Errorf("%w: you cannot set field permissions on system objects", ErrForbidden)
			}
			inputKeys[change.key()] = change
			if change.read.value != nil || change.update.value != nil {
				desired[change.key()] = change
			}
		}
		mirrored := map[string]bool{}
		for _, change := range inputs {
			field := fieldByID[change.fieldID]
			if field.Type != "RELATION" || field.RelationType == nil || (*field.RelationType != "ONE_TO_MANY" && *field.RelationType != "MANY_TO_ONE") ||
				field.TargetObjectID == nil || field.TargetFieldID == nil {
				continue
			}
			mirror := fieldChange{objectID: *field.TargetObjectID, fieldID: *field.TargetFieldID, read: change.read, update: change.update}
			if other, inInput := inputKeys[mirror.key()]; inInput {
				if !sameBool(change.read.value, other.read.value) || !sameBool(change.update.value, other.update.value) {
					return fmt.Errorf("%w: contradicting field permissions have been detected on a relation field", metadata.ErrInvalidInput)
				}
				continue
			}
			if change.read.value == nil && change.update.value == nil {
				mirror.read, mirror.update = optionalBool{present: true}, optionalBool{present: true}
			}
			desired[mirror.key()] = mirror
			mirrored[mirror.key()] = true
		}

		var customApplicationID string
		if err := tx.QueryRow(ctx, `SELECT "workspaceCustomApplicationId"::text FROM core.workspace WHERE id = $1::uuid`, workspace.PinnedWorkspaceID).Scan(&customApplicationID); err != nil {
			return fmt.Errorf("find custom application: %w", err)
		}
		existing, err := queryAll[fieldPermissionRow](ctx, tx, `SELECT jsonb_build_object('id', fp.id, 'objectMetadataId', fp."objectMetadataId", 'fieldMetadataId', fp."fieldMetadataId",
				'roleId', fp."roleId", 'canReadFieldValue', fp."canReadFieldValue", 'canUpdateFieldValue', fp."canUpdateFieldValue", 'applicationId', fp."applicationId")
			FROM core."fieldPermission" fp WHERE fp."workspaceId" = $1::uuid AND fp."roleId" = $2::uuid`, workspace.PinnedWorkspaceID, roleID)
		if err != nil {
			return err
		}
		current := map[string]fieldPermissionRow{}
		for _, row := range existing {
			current[row.ObjectMetadataID+":"+row.FieldMetadataID] = row
		}

		toDelete := map[string]bool{}
		for key, change := range desired {
			row, exists := current[key]
			read, update := change.read.or(row.CanReadFieldValue), change.update.or(row.CanUpdateFieldValue)
			switch {
			case !exists && (read != nil || update != nil):
				_, err = tx.Exec(ctx, `INSERT INTO core."fieldPermission" ("roleId", "objectMetadataId", "fieldMetadataId", "canReadFieldValue", "canUpdateFieldValue",
						"workspaceId", "universalIdentifier", "applicationId") VALUES ($2::uuid, $3::uuid, $4::uuid, $5, $6, $1::uuid, gen_random_uuid(), `+customApplication+`)`,
					workspace.PinnedWorkspaceID, roleID, change.objectID, change.fieldID, read, update)
			case exists && read == nil && update == nil:
				_, inInput := inputKeys[key]
				if !mirrored[key] || inInput || row.ApplicationID == customApplicationID {
					toDelete[row.ID] = true
				}
			case exists && (!sameBool(read, row.CanReadFieldValue) || !sameBool(update, row.CanUpdateFieldValue)):
				_, err = tx.Exec(ctx, `UPDATE core."fieldPermission" SET "canReadFieldValue" = $2, "canUpdateFieldValue" = $3, "updatedAt" = now() WHERE id = $1::uuid`,
					row.ID, read, update)
			}
			if err != nil {
				return fmt.Errorf("write field permission: %w", err)
			}
		}
		for key, row := range current {
			if _, inInput := inputKeys[key]; inInput {
				if _, kept := desired[key]; !kept {
					toDelete[row.ID] = true
				}
			}
		}
		for id := range toDelete {
			if _, err := tx.Exec(ctx, `DELETE FROM core."fieldPermission" WHERE id = $1::uuid`, id); err != nil {
				return fmt.Errorf("delete field permission: %w", err)
			}
		}

		objectIDs := make([]string, len(inputs))
		for i, change := range inputs {
			objectIDs[i] = change.objectID
		}
		result, err = queryAll[FieldPermission](ctx, tx, selectFieldPermissions+` AND fp."objectMetadataId" = ANY($3::uuid[]) ORDER BY fp."createdAt", fp.id`,
			workspace.PinnedWorkspaceID, roleID, objectIDs)
		return err
	})
	return result, err
}

func (r *Roles) UpsertPermissionFlags(ctx context.Context, roleID string, keys []string) ([]RolePermissionFlag, error) {
	var result []RolePermissionFlag
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := getRole(ctx, tx, roleID)
		if err != nil {
			return err
		}
		known, err := queryAll[PermissionFlag](ctx, tx, `SELECT jsonb_build_object('id', id, 'key', key) FROM core."permissionFlag" WHERE "workspaceId" = $1::uuid AND key = ANY($2)`,
			workspace.PinnedWorkspaceID, keys)
		if err != nil {
			return err
		}
		idByKey := map[string]string{}
		for _, flag := range known {
			idByKey[flag.Key] = flag.ID
		}
		var unknown []string
		for _, key := range keys {
			if _, ok := idByKey[key]; !ok {
				unknown = append(unknown, key)
			}
		}
		if len(unknown) > 0 {
			return fmt.Errorf("%w: some of the permissions you selected are not valid: %s", metadata.ErrInvalidInput, strings.Join(unknown, ", "))
		}
		current, err := queryAll[RolePermissionFlag](ctx, tx, selectRolePermissionFlags+` ORDER BY rpf."createdAt", rpf.id`, workspace.PinnedWorkspaceID, roleID)
		if err != nil {
			return err
		}
		held := map[string]bool{}
		var obsolete []string
		for _, flag := range current {
			held[flag.Flag] = true
			if !slices.Contains(keys, flag.Flag) {
				obsolete = append(obsolete, flag.ID)
			}
		}
		var added []string
		for key := range idByKey {
			if !held[key] {
				added = append(added, idByKey[key])
			}
		}
		if len(obsolete) > 0 || len(added) > 0 {
			if err := requireEditable(role); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `DELETE FROM core."rolePermissionFlag" WHERE id = ANY($1::uuid[])`, obsolete); err != nil {
				return fmt.Errorf("delete role permission flags: %w", err)
			}
			if _, err := tx.Exec(ctx, `INSERT INTO core."rolePermissionFlag" ("roleId", "permissionFlagId", "workspaceId", "universalIdentifier", "applicationId")
				SELECT $2::uuid, flag_id, $1::uuid, gen_random_uuid(), `+customApplication+` FROM unnest($3::uuid[]) AS flag_id`,
				workspace.PinnedWorkspaceID, roleID, added); err != nil {
				return fmt.Errorf("insert role permission flags: %w", err)
			}
		}
		result, err = queryAll[RolePermissionFlag](ctx, tx, selectRolePermissionFlags+` ORDER BY rpf."createdAt", rpf.id`, workspace.PinnedWorkspaceID, roleID)
		return err
	})
	return result, err
}
