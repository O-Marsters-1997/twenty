package membership

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

var (
	ErrInvitationInvalid = errors.New("invalid personal invitation token")
	ErrInvitationExpired = errors.New("personal invitation token has expired")
)

func (s *Store) ValidatePersonalInvitation(ctx context.Context, workspaceID, token, email string) (string, error) {
	var id string
	var expired bool
	err := s.pool.QueryRow(ctx,
		`SELECT id::text, "expiresAt" <= now() FROM core."appToken"
		 WHERE type = 'INVITATION_TOKEN' AND value = $1 AND "workspaceId" = NULLIF($2, '')::uuid
		   AND lower(context->>'email') = lower($3) AND "deletedAt" IS NULL AND "revokedAt" IS NULL`,
		token, workspaceID, email,
	).Scan(&id, &expired)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrInvitationInvalid
	}
	if err != nil {
		return "", fmt.Errorf("look up personal invitation: %w", err)
	}
	if expired {
		return "", ErrInvitationExpired
	}
	return id, nil
}

// InvalidatePersonalInvitation deletes the invitation token; a missing one is not an error.
func (s *Store) InvalidatePersonalInvitation(ctx context.Context, workspaceID, token string) error {
	if _, err := s.pool.Exec(ctx,
		`DELETE FROM core."appToken" WHERE type = 'INVITATION_TOKEN' AND value = $1 AND "workspaceId" = NULLIF($2, '')::uuid`,
		token, workspaceID,
	); err != nil {
		return fmt.Errorf("delete personal invitation: %w", err)
	}
	return nil
}
