package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type fieldChange struct {
	objectID, fieldID string
	read, update      tristate
}

type fieldInfo struct {
	ID             string  `json:"id"`
	Type           string  `json:"type"`
	RelationType   *string `json:"relationType"`
	TargetObjectID *string `json:"targetObjectId"`
	TargetFieldID  *string `json:"targetFieldId"`
}

type currentFieldPermission struct {
	FieldPermission
	ApplicationID string `json:"applicationId"`
}

func fieldKey(objectID, fieldID string) string { return objectID + ":" + fieldID }

func (c fieldChange) cleared() bool { return c.read.value == nil && c.update.value == nil }

func (r *Roles) UpsertFieldPermissions(ctx context.Context, rawInput Input) ([]FieldPermission, error) {
	input, _ := deep(rawInput).(Input)
	items := inputItems(input["fieldPermissions"])
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: fieldPermissions must not be empty", metadata.ErrInvalidInput)
	}
	objectIDs, fieldIDs := idsOf(items, "objectMetadataId"), idsOf(items, "fieldMetadataId")
	var result []FieldPermission
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		role, err := editableRole(ctx, tx, input)
		if err != nil {
			return err
		}
		systemObjects, err := ensureObjectsExist(ctx, tx, objectIDs)
		if err != nil {
			return err
		}
		fields, err := queryAll[fieldInfo](ctx, tx, `SELECT jsonb_build_object('id', id, 'type', type, 'relationType', settings->>'relationType',
				'targetObjectId', "relationTargetObjectMetadataId", 'targetFieldId', "relationTargetFieldMetadataId")
			FROM core."fieldMetadata" WHERE "workspaceId" = $1::uuid AND id = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, fieldIDs)
		if err != nil {
			return err
		}
		fieldByID := map[string]fieldInfo{}
		for _, field := range fields {
			fieldByID[field.ID] = field
		}

		desired := map[string]fieldChange{}
		var order []string
		inputKeys := map[string]bool{}
		seenFields := map[string]bool{}
		for _, item := range items {
			change := fieldChange{
				objectID: item["objectMetadataId"].(string), fieldID: item["fieldMetadataId"].(string),
				read: triOf(item, "canReadFieldValue"), update: triOf(item, "canUpdateFieldValue"),
			}
			switch {
			case seenFields[change.fieldID]:
				return fmt.Errorf("%w: cannot accept more than one fieldPermission for field %s in input", metadata.ErrInvalidInput, change.fieldID)
			case (change.read.value != nil && *change.read.value) || (change.update.value != nil && *change.update.value):
				return fmt.Errorf("%w: field permissions can only be used to restrict access, not to grant additional permissions", metadata.ErrInvalidInput)
			case systemObjects[change.objectID]:
				return fmt.Errorf("%w: you cannot set field permissions on system objects as they are managed by the platform", metadata.ErrInvalidInput)
			}
			if _, ok := fieldByID[change.fieldID]; !ok {
				return fmt.Errorf("%w: field metadata %s not found; it may have been deleted", metadata.ErrNotFound, change.fieldID)
			}
			seenFields[change.fieldID] = true
			key := fieldKey(change.objectID, change.fieldID)
			inputKeys[key] = true
			if !change.cleared() {
				desired[key] = change
				order = append(order, key)
			}
		}

		mirrored := map[string]bool{}
		for _, item := range items {
			source := fieldChange{
				objectID: item["objectMetadataId"].(string), fieldID: item["fieldMetadataId"].(string),
				read: triOf(item, "canReadFieldValue"), update: triOf(item, "canUpdateFieldValue"),
			}
			field := fieldByID[source.fieldID]
			mirrorable := field.RelationType != nil && (*field.RelationType == "ONE_TO_MANY" || *field.RelationType == "MANY_TO_ONE")
			if field.Type != "RELATION" || !mirrorable || field.TargetObjectID == nil || field.TargetFieldID == nil {
				continue
			}
			targetKey := fieldKey(*field.TargetObjectID, *field.TargetFieldID)
			if inputKeys[targetKey] {
				for _, other := range items {
					if other["objectMetadataId"] == *field.TargetObjectID && other["fieldMetadataId"] == *field.TargetFieldID &&
						(!sameFlag(source.read.value, triOf(other, "canReadFieldValue").value) || !sameFlag(source.update.value, triOf(other, "canUpdateFieldValue").value)) {
						return fmt.Errorf("%w: contradicting field permissions have been detected on a relation field", metadata.ErrInvalidInput)
					}
				}
				continue
			}
			mirror := fieldChange{objectID: *field.TargetObjectID, fieldID: *field.TargetFieldID, read: source.read, update: source.update}
			if source.cleared() {
				mirror.read, mirror.update = tristate{set: true}, tristate{set: true}
			}
			if _, queued := desired[targetKey]; !queued {
				order = append(order, targetKey)
			}
			desired[targetKey] = mirror
			mirrored[targetKey] = true
		}

		var customApplicationID string
		if err := tx.QueryRow(ctx, `SELECT "workspaceCustomApplicationId"::text FROM core.workspace WHERE id = $1::uuid`, workspace.PinnedWorkspaceID).Scan(&customApplicationID); err != nil {
			return fmt.Errorf("find custom application: %w", err)
		}
		currentRows, err := queryAll[currentFieldPermission](ctx, tx, `SELECT jsonb_build_object('id', id, 'objectMetadataId', "objectMetadataId",
				'fieldMetadataId', "fieldMetadataId", 'roleId', "roleId", 'canReadFieldValue', "canReadFieldValue",
				'canUpdateFieldValue', "canUpdateFieldValue", 'applicationId', "applicationId")
			FROM core."fieldPermission" WHERE "roleId" = $1::uuid`, role.ID)
		if err != nil {
			return err
		}
		current := map[string]currentFieldPermission{}
		for _, row := range currentRows {
			current[fieldKey(row.ObjectMetadataID, row.FieldMetadataID)] = row
		}

		for _, key := range order {
			change := desired[key]
			existing, exists := current[key]
			read, update := change.read.orElse(existing.CanReadFieldValue), change.update.orElse(existing.CanUpdateFieldValue)
			if !exists {
				read, update = change.read.value, change.update.value
			}
			switch {
			case read == nil && update == nil && exists:
				foreignMirror := mirrored[key] && !inputKeys[key] && existing.ApplicationID != customApplicationID
				if !foreignMirror {
					_, err = tx.Exec(ctx, `DELETE FROM core."fieldPermission" WHERE id = $1::uuid`, existing.ID)
				}
			case read == nil && update == nil:
			case !exists:
				_, err = tx.Exec(ctx, `INSERT INTO core."fieldPermission" ("roleId", "objectMetadataId", "fieldMetadataId", "canReadFieldValue", "canUpdateFieldValue",
						"workspaceId", "universalIdentifier", "applicationId")
					VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, gen_random_uuid(), $7::uuid)`,
					role.ID, change.objectID, change.fieldID, read, update, workspace.PinnedWorkspaceID, customApplicationID)
			case !sameFlag(read, existing.CanReadFieldValue) || !sameFlag(update, existing.CanUpdateFieldValue):
				_, err = tx.Exec(ctx, `UPDATE core."fieldPermission" SET "canReadFieldValue" = $2, "canUpdateFieldValue" = $3, "updatedAt" = now() WHERE id = $1::uuid`,
					existing.ID, read, update)
			}
			if err != nil {
				return fmt.Errorf("write field permission: %w", err)
			}
		}
		for key, existing := range current {
			if _, kept := desired[key]; inputKeys[key] && !kept {
				if _, err := tx.Exec(ctx, `DELETE FROM core."fieldPermission" WHERE id = $1::uuid`, existing.ID); err != nil {
					return fmt.Errorf("delete field permission: %w", err)
				}
			}
		}
		result, err = queryAll[FieldPermission](ctx, tx, selectFieldPermissions+` AND "objectMetadataId" = ANY($2::uuid[]) ORDER BY "createdAt", id`, role.ID, objectIDs)
		return err
	})
	return result, err
}
