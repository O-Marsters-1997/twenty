package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	invitationTypes = `('INVITATION_TOKEN', 'ONBOARDING_INVITATION_TOKEN')`
	isoLayout       = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`
)

var errCorruptedInvitation = errors.New("invitation corrupted: missing email in context")

type Invitation struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	RoleID    *string `json:"roleId"`
	ExpiresAt string  `json:"expiresAt"`
}

type ApprovedDomain struct {
	ID          string `json:"id"`
	Domain      string `json:"domain"`
	IsValidated bool   `json:"isValidated"`
	CreatedAt   string `json:"createdAt"`
}

type Invitations struct {
	pool *pgxpool.Pool
}

func NewInvitations(pool *pgxpool.Pool) *Invitations {
	return &Invitations{pool: pool}
}

func (i *Invitations) List(ctx context.Context) ([]Invitation, error) {
	rows, err := i.pool.Query(ctx, `SELECT id::text, context ->> 'email', context ->> 'roleId',
			to_char("expiresAt" AT TIME ZONE 'UTC', `+isoLayout+`)
		FROM core."appToken"
		WHERE "workspaceId" = $1::uuid AND type IN `+invitationTypes+` AND "deletedAt" IS NULL
		ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query invitations: %w", err)
	}
	defer rows.Close()
	invitations := []Invitation{}
	for rows.Next() {
		var invitation Invitation
		var email *string
		if err := rows.Scan(&invitation.ID, &email, &invitation.RoleID, &invitation.ExpiresAt); err != nil {
			return nil, fmt.Errorf("read invitation: %w", err)
		}
		if email == nil || *email == "" {
			return nil, fmt.Errorf("invitation %s: %w", invitation.ID, errCorruptedInvitation)
		}
		invitation.Email = *email
		invitations = append(invitations, invitation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read invitations: %w", err)
	}
	return invitations, nil
}

// Delete reports whether an invitation was removed; a missing or malformed id is not an error.
func (i *Invitations) Delete(ctx context.Context, id string) (bool, error) {
	if _, err := uuid.Parse(id); err != nil {
		return false, nil
	}
	tag, err := i.pool.Exec(ctx, `DELETE FROM core."appToken"
		WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND type IN `+invitationTypes, id, workspace.PinnedWorkspaceID)
	return removed(tag, err, "delete invitation")
}

type ApprovedDomains struct {
	pool *pgxpool.Pool
}

func NewApprovedDomains(pool *pgxpool.Pool) *ApprovedDomains {
	return &ApprovedDomains{pool: pool}
}

func (a *ApprovedDomains) List(ctx context.Context) ([]ApprovedDomain, error) {
	rows, err := a.pool.Query(ctx, `SELECT id::text, domain, "isValidated", to_char("createdAt" AT TIME ZONE 'UTC', `+isoLayout+`)
		FROM core."approvedAccessDomain" WHERE "workspaceId" = $1::uuid ORDER BY "createdAt", id`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query approved access domains: %w", err)
	}
	domains, err := pgx.CollectRows(rows, pgx.RowToStructByPos[ApprovedDomain])
	if err != nil {
		return nil, fmt.Errorf("read approved access domains: %w", err)
	}
	return domains, nil
}

func (a *ApprovedDomains) Delete(ctx context.Context, id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return fmt.Errorf("%w: id must be a UUID", metadata.ErrInvalidInput)
	}
	tag, err := a.pool.Exec(ctx, `DELETE FROM core."approvedAccessDomain" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
		id, workspace.PinnedWorkspaceID)
	deleted, err := removed(tag, err, "delete approved access domain")
	if err != nil {
		return err
	}
	if !deleted {
		return fmt.Errorf("%w: approved access domain not found", metadata.ErrNotFound)
	}
	return nil
}

func removed(tag pgconn.CommandTag, err error, action string) (bool, error) {
	if err != nil {
		return false, fmt.Errorf("%s: %w", action, err)
	}
	return tag.RowsAffected() > 0, nil
}
