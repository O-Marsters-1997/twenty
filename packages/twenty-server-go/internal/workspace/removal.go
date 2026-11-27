package workspace

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrMemberNotFound         = &Error{"BAD_USER_INPUT", "Workspace member to delete not found in workspace", "Workspace member to delete not found in workspace."}
	ErrPermissionDenied       = &Error{"FORBIDDEN", "Entity performing the request does not have permission", "User does not have permission."}
	ErrMemberPermissionDenied = &Error{"FORBIDDEN", "Entity performing the request does not have permission", "You do not have permission to delete this user from the workspace. Please contact your workspace administrator for access."}
	ErrLastAdmin              = &Error{"FORBIDDEN", "Cannot delete account: user is the unique admin of a workspace", "Cannot delete account: you are the only admin. Assign another admin or delete the workspace(s) first."}
	ErrUserNotFound           = &Error{"NOT_FOUND", "UserEntity not found", "User not found."}
)

const adminRoleUniversalIdentifier = "20202020-02c2-43f2-b94d-cab1f2b532eb"

type Identity struct{ ID string }

type Removal struct{ pool *pgxpool.Pool }

func NewRemoval(pool *pgxpool.Pool) *Removal { return &Removal{pool: pool} }

type membership struct{ id, userID, workspaceID string }

func (r *Removal) DeleteWorkspace(ctx context.Context, workspaceID string) (Workspace, error) {
	var deleted Workspace
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		current, err := findWorkspace(ctx, tx, workspaceID, " FOR UPDATE")
		if err != nil {
			return err
		}
		deleted = current
		return softDeleteWorkspace(ctx, tx, workspaceID)
	})
	return deleted, err
}

func (r *Removal) MemberUserID(ctx context.Context, workspaceMemberID string) (string, error) {
	if _, err := uuid.Parse(workspaceMemberID); err != nil {
		return "", ErrMemberNotFound
	}
	var userID string
	err := r.pool.QueryRow(ctx, `SELECT "userId"::text FROM `+SchemaName()+`."workspaceMember" WHERE id = $1::uuid AND "deletedAt" IS NULL`, workspaceMemberID).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrMemberNotFound
	}
	if err != nil {
		return "", fmt.Errorf("find workspace member: %w", err)
	}
	return userID, nil
}

func (r *Removal) RemoveUser(ctx context.Context, workspaceID, userID, actingUserWorkspaceID string) (string, error) {
	var removedID string
	err := pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		memberships, err := userMemberships(ctx, tx, userID)
		if err != nil {
			return err
		}
		index := slices.IndexFunc(memberships, func(current membership) bool { return current.workspaceID == workspaceID })
		if index < 0 {
			return errors.New("user workspace not found")
		}
		removedID = memberships[index].id
		if err := removeMembership(ctx, tx, memberships[index], actingUserWorkspaceID); err != nil {
			return err
		}
		if len(memberships) == 1 {
			return softDeleteUser(ctx, tx, userID)
		}
		return nil
	})
	return removedID, err
}

func (r *Removal) DeleteAccount(ctx context.Context, userID string) error {
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		memberships, err := userMemberships(ctx, tx, userID)
		if err != nil {
			return err
		}
		for _, current := range memberships {
			if err := removeMembership(ctx, tx, current, ""); err != nil {
				return err
			}
		}
		return softDeleteUser(ctx, tx, userID)
	})
}

func userMemberships(ctx context.Context, tx pgx.Tx, userID string) ([]membership, error) {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core."user" WHERE id = $1::uuid AND "deletedAt" IS NULL)`, userID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	if !exists {
		return nil, ErrUserNotFound
	}
	rows, err := tx.Query(ctx, `SELECT id::text, "userId"::text, "workspaceId"::text FROM core."userWorkspace"
		WHERE "userId" = $1::uuid AND "deletedAt" IS NULL ORDER BY "createdAt", id`, userID)
	if err != nil {
		return nil, fmt.Errorf("query user workspaces: %w", err)
	}
	memberships, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (membership, error) {
		var current membership
		err := row.Scan(&current.id, &current.userID, &current.workspaceID)
		return current, err
	})
	if err != nil {
		return nil, fmt.Errorf("read user workspaces: %w", err)
	}
	return memberships, nil
}

func softDeleteUser(ctx context.Context, tx pgx.Tx, userID string) error {
	if _, err := tx.Exec(ctx, `UPDATE core."user" SET "deletedAt" = now(), "updatedAt" = now() WHERE id = $1::uuid AND "deletedAt" IS NULL`, userID); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}
	return nil
}

func softDeleteWorkspace(ctx context.Context, tx pgx.Tx, workspaceID string) error {
	statements := []struct{ name, sql string }{
		{"soft delete users left without a workspace", `UPDATE core."user" SET "deletedAt" = now(), "updatedAt" = now()
			WHERE "deletedAt" IS NULL
				AND id IN (SELECT "userId" FROM core."userWorkspace" WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL)
				AND NOT EXISTS (SELECT 1 FROM core."userWorkspace" other
					WHERE other."userId" = core."user".id AND other."workspaceId" <> $1::uuid AND other."deletedAt" IS NULL)`},
		{"soft delete user workspaces", `UPDATE core."userWorkspace" SET "deletedAt" = now(), "updatedAt" = now()
			WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL`},
		{"soft delete workspace", `UPDATE core.workspace SET "deletedAt" = now(), "updatedAt" = now() WHERE id = $1::uuid AND "deletedAt" IS NULL`},
	}
	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement.sql, workspaceID); err != nil {
			return fmt.Errorf("%s: %w", statement.name, err)
		}
	}
	return nil
}

func removeMembership(ctx context.Context, tx pgx.Tx, leaving membership, actingUserWorkspaceID string) error {
	members := SchemaName() + `."workspaceMember"`
	if _, err := tx.Exec(ctx, `SELECT 1 FROM core.workspace WHERE id = $1::uuid FOR UPDATE`, leaving.workspaceID); err != nil {
		return fmt.Errorf("lock workspace: %w", err)
	}
	var memberCount int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM `+members+` WHERE "deletedAt" IS NULL`).Scan(&memberCount); err != nil {
		return fmt.Errorf("count workspace members: %w", err)
	}
	if memberCount == 1 {
		return softDeleteWorkspace(ctx, tx, leaving.workspaceID)
	}
	if memberCount > 1 {
		if err := assertNotLastAdmin(ctx, tx, leaving); err != nil {
			return err
		}
	}
	var memberID string
	if err := tx.QueryRow(ctx, `SELECT id::text FROM `+members+` WHERE "userId" = $1::uuid AND "deletedAt" IS NULL`, leaving.userID).Scan(&memberID); err != nil {
		return fmt.Errorf("find workspace member: %w", err)
	}
	custodian, err := findCustodian(ctx, tx, leaving, actingUserWorkspaceID)
	if err != nil {
		return err
	}
	if custodian != nil {
		if err := transferConnectedAccounts(ctx, tx, leaving, custodian.id); err != nil {
			return err
		}
	}
	if err := transferRecordShares(ctx, tx, leaving.workspaceID, memberID, custodian); err != nil {
		return err
	}
	statements := []struct {
		name, sql string
		args      []any
	}{
		{"delete chat threads", `DELETE FROM ` + SchemaName() + `."agentChatThread" WHERE "workspaceMemberId" = $1::uuid`, []any{memberID}},
		{"delete workspace member", `DELETE FROM ` + members + ` WHERE "userId" = $1::uuid`, []any{leaving.userID}},
		{"delete role target", `DELETE FROM core."roleTarget" WHERE "userWorkspaceId" = $1::uuid AND "workspaceId" = $2::uuid`, []any{leaving.id, leaving.workspaceID}},
		{"delete user workspace", `DELETE FROM core."userWorkspace" WHERE id = $1::uuid`, []any{leaving.id}},
	}
	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement.sql, statement.args...); err != nil {
			return fmt.Errorf("%s: %w", statement.name, err)
		}
	}
	return nil
}

func assertNotLastAdmin(ctx context.Context, tx pgx.Tx, leaving membership) error {
	var roleID, universalIdentifier string
	err := tx.QueryRow(ctx, `SELECT r.id::text, r."universalIdentifier"::text FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."userWorkspaceId" = $1::uuid AND rt."workspaceId" = $2::uuid`, leaving.id, leaving.workspaceID).Scan(&roleID, &universalIdentifier)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("no role found for user workspace %s", leaving.id)
	}
	if err != nil {
		return fmt.Errorf("find role of user workspace: %w", err)
	}
	if universalIdentifier != adminRoleUniversalIdentifier {
		return nil
	}
	var admins int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM core."roleTarget" rt JOIN core."userWorkspace" uw ON uw.id = rt."userWorkspaceId" AND uw."deletedAt" IS NULL
		WHERE rt."roleId" = $1::uuid AND rt."workspaceId" = $2::uuid`, roleID, leaving.workspaceID).Scan(&admins); err != nil {
		return fmt.Errorf("count admins: %w", err)
	}
	if admins == 1 {
		return ErrLastAdmin
	}
	return nil
}

func findCustodian(ctx context.Context, tx pgx.Tx, leaving membership, actingUserWorkspaceID string) (*membership, error) {
	rows, err := tx.Query(ctx, `SELECT uw.id::text, uw."userId"::text, uw."workspaceId"::text,
			EXISTS (SELECT 1 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
				WHERE rt."userWorkspaceId" = uw.id AND r."universalIdentifier" = $3::uuid)
		FROM core."userWorkspace" uw
		WHERE uw."workspaceId" = $1::uuid AND uw.id <> $2::uuid AND uw."deletedAt" IS NULL ORDER BY uw."createdAt", uw.id`,
		leaving.workspaceID, leaving.id, adminRoleUniversalIdentifier)
	if err != nil {
		return nil, fmt.Errorf("query custodian candidates: %w", err)
	}
	type candidate struct {
		membership
		isAdmin bool
	}
	candidates, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (candidate, error) {
		var current candidate
		err := row.Scan(&current.id, &current.userID, &current.workspaceID, &current.isAdmin)
		return current, err
	})
	if err != nil {
		return nil, fmt.Errorf("read custodian candidates: %w", err)
	}
	var oldestAdmin *membership
	for index := range candidates {
		if candidates[index].id == actingUserWorkspaceID {
			return &candidates[index].membership, nil
		}
		if candidates[index].isAdmin && oldestAdmin == nil {
			oldestAdmin = &candidates[index].membership
		}
	}
	switch {
	case oldestAdmin != nil:
		return oldestAdmin, nil
	case len(candidates) > 0:
		return &candidates[0].membership, nil
	}
	return nil, nil
}

func transferConnectedAccounts(ctx context.Context, tx pgx.Tx, leaving membership, custodianID string) error {
	owned := `SELECT id FROM core."connectedAccount" WHERE "userWorkspaceId" = $1::uuid AND "workspaceId" = $2::uuid`
	statements := []struct{ name, sql string }{
		{"stop message sync", `UPDATE core."messageChannel" SET "isSyncEnabled" = false, "updatedAt" = now(),
			"webhookSubscriptionStatus" = CASE WHEN "webhookSubscriptionStatus" = 'PENDING' THEN 'EXPIRED' ELSE "webhookSubscriptionStatus" END
			WHERE "workspaceId" = $2::uuid AND "connectedAccountId" IN (` + owned + `)`},
		{"stop calendar sync", `UPDATE core."calendarChannel" SET "isSyncEnabled" = false, "updatedAt" = now(),
			"webhookSubscriptionStatus" = CASE WHEN "webhookSubscriptionStatus" = 'PENDING' THEN 'EXPIRED' ELSE "webhookSubscriptionStatus" END
			WHERE "workspaceId" = $2::uuid AND "connectedAccountId" IN (` + owned + `)`},
	}
	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement.sql, leaving.id, leaving.workspaceID); err != nil {
			return fmt.Errorf("%s: %w", statement.name, err)
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE core."connectedAccount" SET "userWorkspaceId" = $3::uuid, "accessToken" = NULL, "refreshToken" = NULL,
			"connectionParameters" = NULL, "archivedAt" = COALESCE("archivedAt", now()), "updatedAt" = now()
		WHERE "userWorkspaceId" = $1::uuid AND "workspaceId" = $2::uuid`, leaving.id, leaving.workspaceID, custodianID); err != nil {
		return fmt.Errorf("transfer connected accounts: %w", err)
	}
	return nil
}

const transferableObjects = `SELECT id FROM core."objectMetadata" WHERE "workspaceId" = $1::uuid AND readability = 'OPEN' AND NOT "isSystem"`

func transferRecordShares(ctx context.Context, tx pgx.Tx, workspaceID, fromMemberID string, custodian *membership) error {
	shares := SchemaName() + `."recordShare"`
	if custodian != nil {
		var toMemberID string
		err := tx.QueryRow(ctx, `SELECT id::text FROM `+SchemaName()+`."workspaceMember" WHERE "userId" = $1::uuid AND "deletedAt" IS NULL`, custodian.userID).Scan(&toMemberID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("find custodian member: %w", err)
		}
		if err == nil {
			statements := []struct{ name, sql string }{
				{"copy full record access", `INSERT INTO ` + shares + ` ("recordId", "objectMetadataId", "principalId", "principalType", "accessLevel", "rowCause", "sourceId")
					SELECT "recordId", "objectMetadataId", $3::uuid, "principalType", "accessLevel", "rowCause", "sourceId" FROM ` + shares + `
					WHERE "objectMetadataId" IN (` + transferableObjects + `) AND "principalType" = 'WORKSPACE_MEMBER' AND "rowCause" IN ('OWNER', 'MANUAL')
						AND "principalId" = $2::uuid AND "accessLevel" = 'FULL' AND "deletedAt" IS NULL
					ON CONFLICT DO NOTHING`},
				{"raise custodian record access", `UPDATE ` + shares + ` AS held SET "accessLevel" = 'FULL', "updatedAt" = now() FROM ` + shares + ` AS leaving
					WHERE leaving."objectMetadataId" IN (` + transferableObjects + `) AND leaving."principalType" = 'WORKSPACE_MEMBER'
						AND leaving."rowCause" IN ('OWNER', 'MANUAL') AND leaving."principalId" = $2::uuid
						AND leaving."accessLevel" = 'FULL' AND leaving."deletedAt" IS NULL
						AND held."objectMetadataId" = leaving."objectMetadataId" AND held."recordId" = leaving."recordId"
						AND held."rowCause" = leaving."rowCause" AND held."sourceId" = leaving."sourceId"
						AND held."principalType" = 'WORKSPACE_MEMBER' AND held."principalId" = $3::uuid AND held."accessLevel" <> 'FULL'`},
			}
			for _, statement := range statements {
				if _, err := tx.Exec(ctx, statement.sql, workspaceID, fromMemberID, toMemberID); err != nil {
					return fmt.Errorf("%s: %w", statement.name, err)
				}
			}
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM `+shares+` WHERE "objectMetadataId" IN (`+transferableObjects+`) AND "principalType" = 'WORKSPACE_MEMBER'
		AND "rowCause" IN ('OWNER', 'MANUAL') AND "principalId" = $2::uuid`, workspaceID, fromMemberID); err != nil {
		return fmt.Errorf("delete leaving member record access: %w", err)
	}
	return nil
}
