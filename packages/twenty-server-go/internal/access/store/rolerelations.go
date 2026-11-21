package store

import (
	"context"
	"fmt"

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

type RoleAPIKey struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ExpiresAt string  `json:"expiresAt"`
	RevokedAt *string `json:"revokedAt"`
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
	selectObjectPermissions = `SELECT jsonb_build_object('objectMetadataId', op."objectMetadataId", 'canReadObjectRecords', op."canReadObjectRecords",
			'canUpdateObjectRecords', op."canUpdateObjectRecords", 'canSoftDeleteObjectRecords', op."canSoftDeleteObjectRecords",
			'canDestroyObjectRecords', op."canDestroyObjectRecords")
		FROM core."objectPermission" op WHERE op."workspaceId" = $1::uuid AND op."roleId" = $2::uuid`
	selectFieldPermissions = `SELECT jsonb_build_object('id', fp.id, 'objectMetadataId', fp."objectMetadataId", 'fieldMetadataId', fp."fieldMetadataId",
			'roleId', fp."roleId", 'canReadFieldValue', fp."canReadFieldValue", 'canUpdateFieldValue', fp."canUpdateFieldValue")
		FROM core."fieldPermission" fp WHERE fp."workspaceId" = $1::uuid AND fp."roleId" = $2::uuid`
	selectRolePermissionFlags = `SELECT jsonb_build_object('id', rpf.id, 'roleId', rpf."roleId", 'flag', pf.key)
		FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		WHERE rpf."workspaceId" = $1::uuid AND rpf."roleId" = $2::uuid`
)

var (
	selectWorkspaceMembers = `SELECT jsonb_build_object('id', wm.id,
			'name', jsonb_build_object('firstName', COALESCE(wm."nameFirstName", ''), 'lastName', COALESCE(wm."nameLastName", '')),
			'avatarUrl', wm."avatarUrl", 'userEmail', COALESCE(wm."userEmail", ''), 'userId', wm."userId", 'userWorkspaceId', uw.id)
		FROM ` + fmt.Sprintf(`%q`, workspace.SchemaName()) + `."workspaceMember" wm
		JOIN core."userWorkspace" uw ON uw."userId" = wm."userId" AND uw."workspaceId" = $1::uuid
		JOIN core."roleTarget" rt ON rt."userWorkspaceId" = uw.id AND rt."roleId" = $2::uuid
		WHERE wm."deletedAt" IS NULL ORDER BY wm."createdAt", wm.id`
	selectRoleAgents = `SELECT jsonb_build_object('id', a.id, 'name', a.name, 'label', a.label, 'icon', a.icon, 'description', a.description, 'prompt', a.prompt,
			'modelId', a."modelId", 'responseFormat', a."responseFormat", 'roleId', rt."roleId", 'isCustom', a."isCustom", 'isSystem', a."isSystem",
			'applicationId', a."applicationId", 'createdAt', ` + iso(`a."createdAt"`) + `, 'updatedAt', ` + iso(`a."updatedAt"`) + `,
			'modelConfiguration', a."modelConfiguration", 'triggers', a.triggers)
		FROM core.agent a JOIN core."roleTarget" rt ON rt."agentId" = a.id
		WHERE a."workspaceId" = $1::uuid AND rt."roleId" = $2::uuid AND a."deletedAt" IS NULL ORDER BY a."createdAt", a.id`
	selectRoleAPIKeys = `SELECT jsonb_build_object('id', k.id, 'name', k.name, 'expiresAt', ` + iso(`k."expiresAt"`) + `, 'revokedAt', ` + iso(`k."revokedAt"`) + `)
		FROM core."apiKey" k JOIN core."roleTarget" rt ON rt."apiKeyId" = k.id
		WHERE k."workspaceId" = $1::uuid AND rt."roleId" = $2::uuid ORDER BY k."createdAt", k.id`
	selectPredicates = `SELECT to_jsonb(p) - 'workspaceId' - 'universalIdentifier' - 'applicationId' - 'createdAt' - 'updatedAt' - 'deletedAt'
		FROM core."rowLevelPermissionPredicate" p WHERE p."workspaceId" = $1::uuid AND p."roleId" = $2::uuid AND p."deletedAt" IS NULL ORDER BY p."createdAt", p.id`
	selectPredicateGroups = `SELECT to_jsonb(g) - 'workspaceId' - 'universalIdentifier' - 'applicationId' - 'createdAt' - 'updatedAt' - 'deletedAt'
		FROM core."rowLevelPermissionPredicateGroup" g WHERE g."workspaceId" = $1::uuid AND g."roleId" = $2::uuid AND g."deletedAt" IS NULL ORDER BY g."createdAt", g.id`
)

func (r *Roles) PermissionFlags(ctx context.Context) ([]PermissionFlag, error) {
	return queryAll[PermissionFlag](ctx, r.pool, `SELECT jsonb_build_object('id', pf.id, 'universalIdentifier', pf."universalIdentifier", 'key', pf.key,
			'label', pf.label, 'description', pf.description, 'icon', pf.icon, 'permissionType', pf."permissionType", 'applicationId', pf."applicationId",
			'createdAt', `+iso(`pf."createdAt"`)+`, 'updatedAt', `+iso(`pf."updatedAt"`)+`)
		FROM core."permissionFlag" pf WHERE pf."workspaceId" = $1::uuid ORDER BY pf."createdAt", pf.id`, workspace.PinnedWorkspaceID)
}

func (r *Roles) WorkspaceMembers(ctx context.Context, roleID string) ([]WorkspaceMember, error) {
	return queryAll[WorkspaceMember](ctx, r.pool, selectWorkspaceMembers, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) Agents(ctx context.Context, roleID string) ([]RoleAgent, error) {
	return queryAll[RoleAgent](ctx, r.pool, selectRoleAgents, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) APIKeys(ctx context.Context, roleID string) ([]RoleAPIKey, error) {
	return queryAll[RoleAPIKey](ctx, r.pool, selectRoleAPIKeys, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) RolePermissionFlags(ctx context.Context, roleID string) ([]RolePermissionFlag, error) {
	return queryAll[RolePermissionFlag](ctx, r.pool, selectRolePermissionFlags+` ORDER BY rpf."createdAt", rpf.id`, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) ObjectPermissions(ctx context.Context, roleID string) ([]ObjectPermission, error) {
	return queryAll[ObjectPermission](ctx, r.pool, selectObjectPermissions+` ORDER BY op."createdAt", op.id`, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) FieldPermissions(ctx context.Context, roleID string) ([]FieldPermission, error) {
	return queryAll[FieldPermission](ctx, r.pool, selectFieldPermissions+` ORDER BY fp."createdAt", fp.id`, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) Predicates(ctx context.Context, roleID string) ([]RowLevelPermissionPredicate, error) {
	return queryAll[RowLevelPermissionPredicate](ctx, r.pool, selectPredicates, workspace.PinnedWorkspaceID, roleID)
}

func (r *Roles) PredicateGroups(ctx context.Context, roleID string) ([]RowLevelPermissionPredicateGroup, error) {
	return queryAll[RowLevelPermissionPredicateGroup](ctx, r.pool, selectPredicateGroups, workspace.PinnedWorkspaceID, roleID)
}
