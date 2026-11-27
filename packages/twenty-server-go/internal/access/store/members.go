package store

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	FlagWorkspaceMembers = "WORKSPACE_MEMBERS"
	FlagWorkspace        = "WORKSPACE"

	adminRoleUniversalIdentifier = "20202020-02c2-43f2-b94d-cab1f2b532eb"
)

var (
	memberTable    = fmt.Sprintf(`%q."workspaceMember"`, workspace.SchemaName())
	memberDocument = `jsonb_build_object('id', wm.id,
		'name', jsonb_build_object('firstName', COALESCE(wm."nameFirstName", ''), 'lastName', COALESCE(wm."nameLastName", '')),
		'avatarUrl', wm."avatarUrl", 'userEmail', COALESCE(wm."userEmail", ''), 'userId', wm."userId", 'userWorkspaceId', uw.id,
		'colorScheme', wm."colorScheme", 'uiScale', wm."uiScale", 'openRecordIn', wm."openRecordIn", 'locale', wm.locale,
		'timeZone', wm."timeZone", 'dateFormat', wm."dateFormat", 'timeFormat', wm."timeFormat",
		'calendarStartDay', wm."calendarStartDay", 'numberFormat', wm."numberFormat")`
	selectMember = `SELECT ` + memberDocument + ` FROM ` + memberTable + ` wm
		LEFT JOIN core."userWorkspace" uw ON uw."userId" = wm."userId" AND uw."workspaceId" = $1::uuid
		WHERE wm."deletedAt" IS NULL AND wm.id = $2::uuid`
)

var memberSettingColumns = map[string]string{
	"colorScheme": `"colorScheme"`, "uiScale": `"uiScale"`, "openRecordIn": `"openRecordIn"`, "locale": `"locale"`,
	"avatarUrl": `"avatarUrl"`, "jobTitle": `"jobTitle"`, "calendarStartDay": `"calendarStartDay"`, "timeZone": `"timeZone"`,
	"dateFormat": `"dateFormat"`, "timeFormat": `"timeFormat"`, "numberFormat": `"numberFormat"`,
}

var uiScales = []string{"Smaller", "Default", "Large", "Larger"}

func (r *Roles) Member(ctx context.Context, workspaceMemberID string) (WorkspaceMember, error) {
	return memberByID(ctx, r.pool, workspaceMemberID)
}

func memberByID(ctx context.Context, conn db, workspaceMemberID string) (WorkspaceMember, error) {
	return queryOne[WorkspaceMember](ctx, conn, "Workspace member not found", selectMember, workspace.PinnedWorkspaceID, workspaceMemberID)
}

func (r *Roles) ForUserWorkspace(ctx context.Context, userWorkspaceID string) ([]Role, error) {
	return queryAll[Role](ctx, r.pool, selectRoles+` AND r.id IN (SELECT "roleId" FROM core."roleTarget" WHERE "userWorkspaceId" = NULLIF($2, '')::uuid)
		ORDER BY r.label`, workspace.PinnedWorkspaceID, userWorkspaceID)
}

func (r *Roles) AssignToWorkspaceMember(ctx context.Context, workspaceMemberID, roleID, actingUserWorkspaceID string) (WorkspaceMember, error) {
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		member, err := memberByID(ctx, tx, workspaceMemberID)
		if err != nil {
			return err
		}
		if member.UserWorkspaceID == "" {
			return fmt.Errorf("%w: User workspace not found", metadata.ErrNotFound)
		}
		if member.UserWorkspaceID == actingUserWorkspaceID {
			return fmt.Errorf("%w: Cannot update self role", ErrForbidden)
		}
		role, err := getRole(ctx, tx, roleID)
		if err != nil {
			return err
		}
		if !role.CanBeAssignedToUsers {
			return fmt.Errorf("%w: Role cannot be assigned to users", metadata.ErrInvalidInput)
		}
		return setUserWorkspaceRole(ctx, tx, member.UserWorkspaceID, roleID)
	})
	if err != nil {
		return WorkspaceMember{}, err
	}
	return r.Member(ctx, workspaceMemberID)
}

func setUserWorkspaceRole(ctx context.Context, tx pgx.Tx, userWorkspaceID, roleID string) error {
	var currentRoleID string
	var currentIsAdmin bool
	err := tx.QueryRow(ctx, `SELECT rt."roleId"::text, r."universalIdentifier" = $2::uuid FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."userWorkspaceId" = $1::uuid`, userWorkspaceID, adminRoleUniversalIdentifier).Scan(&currentRoleID, &currentIsAdmin)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		_, err = tx.Exec(ctx, `INSERT INTO core."roleTarget" ("roleId", "userWorkspaceId", "universalIdentifier", "workspaceId", "applicationId")
			VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
			roleID, userWorkspaceID, workspace.PinnedWorkspaceID)
		return err
	case err != nil:
		return fmt.Errorf("find current role: %w", err)
	case currentRoleID == roleID:
		return nil
	}
	if currentIsAdmin {
		var admins int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM core."roleTarget" WHERE "roleId" = $1::uuid AND "userWorkspaceId" IS NOT NULL`, currentRoleID).Scan(&admins); err != nil {
			return fmt.Errorf("count admins: %w", err)
		}
		if admins == 1 {
			return fmt.Errorf("%w: Cannot unassign admin role from last admin of the workspace", ErrForbidden)
		}
	}
	_, err = tx.Exec(ctx, `UPDATE core."roleTarget" SET "roleId" = $2::uuid, "updatedAt" = now() WHERE "userWorkspaceId" = $1::uuid`, userWorkspaceID, roleID)
	return err
}

func (r *Roles) UpdateMemberSettings(ctx context.Context, workspaceMemberID string, update map[string]any) error {
	if len(update) == 0 {
		return fmt.Errorf("%w: Update payload cannot be empty", metadata.ErrInvalidInput)
	}
	args := []any{workspaceMemberID}
	var assignments []string
	assign := func(column string, value any) {
		args = append(args, value)
		assignments = append(assignments, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	for key, value := range update {
		column, known := memberSettingColumns[key]
		switch {
		case key == "name":
			name, _ := value.(map[string]any)
			for part, nameColumn := range map[string]string{"firstName": `"nameFirstName"`, "lastName": `"nameLastName"`} {
				if partValue, present := name[part]; present {
					assign(nameColumn, partValue)
				}
			}
		case !known:
			return fmt.Errorf("%w: Cannot update custom workspaceMember field via this endpoint: %s", metadata.ErrInvalidInput, key)
		case key == "uiScale" && !slices.Contains(uiScales, fmt.Sprint(value)):
			return fmt.Errorf("%w: Invalid value for workspaceMember field uiScale: %v", metadata.ErrInvalidInput, value)
		default:
			assign(column, value)
		}
	}
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `UPDATE `+memberTable+` SET `+strings.Join(append(assignments, `"updatedAt" = now()`), ", ")+` WHERE id = $1::uuid AND "deletedAt" IS NULL`, args...)
		switch {
		case err != nil:
			return fmt.Errorf("update workspace member: %w", err)
		case tag.RowsAffected() == 0:
			return fmt.Errorf("%w: Workspace member not found", metadata.ErrInvalidInput)
		}
		if locale, present := update["locale"]; present && locale != nil {
			if _, err := tx.Exec(ctx, `UPDATE core."userWorkspace" SET locale = $2, "updatedAt" = now()
				WHERE "workspaceId" = $3::uuid AND "userId" = (SELECT "userId" FROM `+memberTable+` WHERE id = $1::uuid)`,
				workspaceMemberID, locale, workspace.PinnedWorkspaceID); err != nil {
				return fmt.Errorf("update user workspace locale: %w", err)
			}
		}
		return nil
	})
}

func (r *Roles) MemberUserID(ctx context.Context, workspaceMemberID string) (string, error) {
	member, err := r.Member(ctx, workspaceMemberID)
	if errors.Is(err, metadata.ErrNotFound) {
		return "", fmt.Errorf("%w: Workspace member not found", metadata.ErrInvalidInput)
	}
	return member.UserID, err
}
