package store

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type FullName struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type WorkspaceMember struct {
	ID              string   `json:"id"`
	Name            FullName `json:"name"`
	AvatarURL       *string  `json:"avatarUrl"`
	UserEmail       string   `json:"userEmail"`
	UserID          string   `json:"userId"`
	UserWorkspaceID string   `json:"userWorkspaceId"`
}

type RoleAgent struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Label              string  `json:"label"`
	Icon               *string `json:"icon"`
	Description        *string `json:"description"`
	Prompt             string  `json:"prompt"`
	ModelID            string  `json:"modelId"`
	ResponseFormat     any     `json:"responseFormat"`
	RoleID             string  `json:"roleId"`
	IsCustom           bool    `json:"isCustom"`
	IsSystem           bool    `json:"isSystem"`
	ApplicationID      string  `json:"applicationId"`
	CreatedAt          string  `json:"createdAt"`
	UpdatedAt          string  `json:"updatedAt"`
	ModelConfiguration any     `json:"modelConfiguration"`
	Triggers           []any   `json:"triggers"`
}

type PermissionFlag struct {
	ID                  string  `json:"id"`
	UniversalIdentifier string  `json:"universalIdentifier"`
	Key                 string  `json:"key"`
	Label               string  `json:"label"`
	Description         *string `json:"description"`
	Icon                *string `json:"icon"`
	PermissionType      string  `json:"permissionType"`
	ApplicationID       string  `json:"applicationId"`
	CreatedAt           string  `json:"createdAt"`
	UpdatedAt           string  `json:"updatedAt"`
}

type RolePermissionFlag struct {
	ID     string `json:"id"`
	RoleID string `json:"roleId"`
	Flag   string `json:"flag"`
}

type ObjectPermission struct {
	ObjectMetadataID           string `json:"objectMetadataId"`
	CanReadObjectRecords       *bool  `json:"canReadObjectRecords"`
	CanUpdateObjectRecords     *bool  `json:"canUpdateObjectRecords"`
	CanSoftDeleteObjectRecords *bool  `json:"canSoftDeleteObjectRecords"`
	CanDestroyObjectRecords    *bool  `json:"canDestroyObjectRecords"`
	RestrictedFields           any    `json:"restrictedFields"`
}

type FieldPermission struct {
	ID                  string `json:"id"`
	ObjectMetadataID    string `json:"objectMetadataId"`
	FieldMetadataID     string `json:"fieldMetadataId"`
	RoleID              string `json:"roleId"`
	CanReadFieldValue   *bool  `json:"canReadFieldValue"`
	CanUpdateFieldValue *bool  `json:"canUpdateFieldValue"`
}

type RowLevelPermissionPredicate struct {
	ID                                         string   `json:"id"`
	FieldMetadataID                            string   `json:"fieldMetadataId"`
	ObjectMetadataID                           string   `json:"objectMetadataId"`
	Operand                                    string   `json:"operand"`
	SubFieldName                               *string  `json:"subFieldName"`
	WorkspaceMemberFieldMetadataID             *string  `json:"workspaceMemberFieldMetadataId"`
	WorkspaceMemberSubFieldName                *string  `json:"workspaceMemberSubFieldName"`
	RowLevelPermissionPredicateGroupID         *string  `json:"rowLevelPermissionPredicateGroupId"`
	PositionInRowLevelPermissionPredicateGroup *float64 `json:"positionInRowLevelPermissionPredicateGroup"`
	RoleID                                     string   `json:"roleId"`
	Value                                      any      `json:"value"`
}

type RowLevelPermissionPredicateGroup struct {
	ID                                         string   `json:"id"`
	ParentRowLevelPermissionPredicateGroupID   *string  `json:"parentRowLevelPermissionPredicateGroupId"`
	LogicalOperator                            string   `json:"logicalOperator"`
	PositionInRowLevelPermissionPredicateGroup *float64 `json:"positionInRowLevelPermissionPredicateGroup"`
	RoleID                                     string   `json:"roleId"`
	ObjectMetadataID                           string   `json:"objectMetadataId"`
}

const (
	selectObjectPermissions = `SELECT jsonb_build_object('objectMetadataId', "objectMetadataId", 'canReadObjectRecords', "canReadObjectRecords",
		'canUpdateObjectRecords', "canUpdateObjectRecords", 'canSoftDeleteObjectRecords', "canSoftDeleteObjectRecords",
		'canDestroyObjectRecords', "canDestroyObjectRecords") FROM core."objectPermission" WHERE "roleId" = $1::uuid`
	selectFieldPermissions = `SELECT jsonb_build_object('id', id, 'objectMetadataId', "objectMetadataId", 'fieldMetadataId', "fieldMetadataId",
		'roleId', "roleId", 'canReadFieldValue', "canReadFieldValue", 'canUpdateFieldValue', "canUpdateFieldValue")
		FROM core."fieldPermission" WHERE "roleId" = $1::uuid`
	selectRoleFlags = `SELECT jsonb_build_object('id', rpf.id, 'roleId', rpf."roleId", 'flag', pf.key)
		FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId" WHERE rpf."roleId" = $1::uuid`
)

func (r *Roles) PermissionFlags(ctx context.Context) ([]PermissionFlag, error) {
	return queryAll[PermissionFlag](ctx, r.pool, `SELECT jsonb_build_object('id', id, 'universalIdentifier', "universalIdentifier", 'key', key,
			'label', label, 'description', description, 'icon', icon, 'permissionType', "permissionType", 'applicationId', "applicationId",
			'createdAt', `+iso(`"createdAt"`)+`, 'updatedAt', `+iso(`"updatedAt"`)+`)
		FROM core."permissionFlag" WHERE "workspaceId" = $1::uuid ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID)
}

func (r *Roles) WorkspaceMembers(ctx context.Context, roleID string) ([]WorkspaceMember, error) {
	return queryAll[WorkspaceMember](ctx, r.pool, `SELECT jsonb_build_object('id', wm.id,
			'name', jsonb_build_object('firstName', COALESCE(wm."nameFirstName", ''), 'lastName', COALESCE(wm."nameLastName", '')),
			'avatarUrl', NULLIF(wm."avatarUrl", ''), 'userEmail', COALESCE(wm."userEmail", ''), 'userId', wm."userId", 'userWorkspaceId', uw.id)
		FROM core."roleTarget" rt
		JOIN core."userWorkspace" uw ON uw.id = rt."userWorkspaceId"
		JOIN `+workspace.SchemaName()+`."workspaceMember" wm ON wm."userId" = uw."userId" AND wm."deletedAt" IS NULL
		WHERE rt."roleId" = $1::uuid AND rt."workspaceId" = $2::uuid ORDER BY wm."createdAt", wm.id`, roleID, workspace.PinnedWorkspaceID)
}

func (r *Roles) Agents(ctx context.Context, roleID string) ([]RoleAgent, error) {
	return queryAll[RoleAgent](ctx, r.pool, `SELECT jsonb_build_object('id', a.id, 'name', a.name, 'label', a.label, 'icon', a.icon,
			'description', a.description, 'prompt', a.prompt, 'modelId', a."modelId", 'responseFormat', a."responseFormat", 'roleId', rt."roleId",
			'isCustom', a."isCustom", 'isSystem', a."isSystem", 'applicationId', a."applicationId", 'createdAt', `+iso(`a."createdAt"`)+`,
			'updatedAt', `+iso(`a."updatedAt"`)+`, 'modelConfiguration', a."modelConfiguration", 'triggers', a.triggers)
		FROM core."roleTarget" rt JOIN core.agent a ON a.id = rt."agentId"
		WHERE rt."roleId" = $1::uuid AND rt."workspaceId" = $2::uuid AND a."deletedAt" IS NULL ORDER BY a."createdAt", a.id`, roleID, workspace.PinnedWorkspaceID)
}

func (r *Roles) APIKeys(ctx context.Context, roleID string) ([]APIKey, error) {
	return queryAll[APIKey](ctx, r.pool, `SELECT jsonb_build_object('id', k.id, 'name', k.name, 'expiresAt', `+iso(`k."expiresAt"`)+`,
			'revokedAt', NULL::text, 'createdAt', `+iso(`k."createdAt"`)+`)
		FROM core."roleTarget" rt JOIN core."apiKey" k ON k.id = rt."apiKeyId"
		WHERE rt."roleId" = $1::uuid AND rt."workspaceId" = $2::uuid AND k."revokedAt" IS NULL ORDER BY k."createdAt", k.id`, roleID, workspace.PinnedWorkspaceID)
}

func (r *Roles) RolePermissionFlags(ctx context.Context, roleID string) ([]RolePermissionFlag, error) {
	return queryAll[RolePermissionFlag](ctx, r.pool, selectRoleFlags+` ORDER BY rpf."createdAt", rpf.id`, roleID)
}

func (r *Roles) ObjectPermissions(ctx context.Context, roleID string) ([]ObjectPermission, error) {
	return queryAll[ObjectPermission](ctx, r.pool, selectObjectPermissions+` ORDER BY "createdAt", id`, roleID)
}

func (r *Roles) FieldPermissions(ctx context.Context, roleID string) ([]FieldPermission, error) {
	return queryAll[FieldPermission](ctx, r.pool, selectFieldPermissions+` ORDER BY "createdAt", id`, roleID)
}

func (r *Roles) Predicates(ctx context.Context, roleID string) ([]RowLevelPermissionPredicate, error) {
	return queryAll[RowLevelPermissionPredicate](ctx, r.pool, `SELECT jsonb_build_object('id', id, 'fieldMetadataId', "fieldMetadataId",
			'objectMetadataId', "objectMetadataId", 'operand', operand::text, 'subFieldName', "subFieldName",
			'workspaceMemberFieldMetadataId', "workspaceMemberFieldMetadataId", 'workspaceMemberSubFieldName', "workspaceMemberSubFieldName",
			'rowLevelPermissionPredicateGroupId', "rowLevelPermissionPredicateGroupId",
			'positionInRowLevelPermissionPredicateGroup', "positionInRowLevelPermissionPredicateGroup", 'roleId', "roleId", 'value', value)
		FROM core."rowLevelPermissionPredicate" WHERE "roleId" = $1::uuid AND "deletedAt" IS NULL
		ORDER BY COALESCE("positionInRowLevelPermissionPredicateGroup", 0), id`, roleID)
}

func (r *Roles) PredicateGroups(ctx context.Context, roleID string) ([]RowLevelPermissionPredicateGroup, error) {
	return queryAll[RowLevelPermissionPredicateGroup](ctx, r.pool, `SELECT jsonb_build_object('id', id,
			'parentRowLevelPermissionPredicateGroupId', "parentRowLevelPermissionPredicateGroupId", 'logicalOperator', "logicalOperator"::text,
			'positionInRowLevelPermissionPredicateGroup', "positionInRowLevelPermissionPredicateGroup", 'roleId', "roleId", 'objectMetadataId', "objectMetadataId")
		FROM core."rowLevelPermissionPredicateGroup" WHERE "roleId" = $1::uuid AND "deletedAt" IS NULL
		ORDER BY COALESCE("positionInRowLevelPermissionPredicateGroup", 0), id`, roleID)
}
