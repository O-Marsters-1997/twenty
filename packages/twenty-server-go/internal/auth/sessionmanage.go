package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

const sessionRevokedUserRevoked = "USER_REVOKED"

type SessionSummary struct {
	ID           string
	WorkspaceID  *string
	AuthProvider string
	UserAgent    *string
	IPAddress    *string
	CreatedAt    time.Time
	LastActiveAt time.Time
	ExpiresAt    time.Time
	IsCurrent    bool
}

func (s *UserSession) CurrentSessions(ctx context.Context, r *http.Request, principal Principal) ([]SessionSummary, error) {
	if err := requireSessionCaller(principal); err != nil {
		return nil, err
	}
	if principal.WorkspaceID == "" {
		return []SessionSummary{}, nil
	}
	return s.activeSessions(ctx, r, principal)
}

func (s *UserSession) RevokeSession(ctx context.Context, w http.ResponseWriter, r *http.Request, principal Principal, sessionID string) (bool, error) {
	if err := requireSessionCaller(principal); err != nil {
		return false, err
	}
	if principal.WorkspaceID == "" {
		return false, nil
	}
	sessions, err := s.activeSessions(ctx, r, principal)
	if err != nil {
		return false, err
	}
	var tokenHash string
	err = s.pool.QueryRow(ctx,
		`SELECT "tokenHash" FROM core."userSession" WHERE id = $1::uuid AND "userId" = $2::uuid AND "workspaceId" = $3::uuid`,
		sessionID, principal.UserID, principal.WorkspaceID,
	).Scan(&tokenHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, newTwoFactorError("FORBIDDEN_EXCEPTION", "Session not found")
	}
	if err != nil {
		return false, fmt.Errorf("look up user session: %w", err)
	}
	updated, err := s.pool.Exec(ctx,
		`UPDATE core."userSession" SET "revokedAt" = now(), "revokedReason" = $2, "updatedAt" = now()
		 WHERE id = $1::uuid AND "revokedAt" IS NULL`, sessionID, sessionRevokedUserRevoked)
	if err != nil {
		return false, fmt.Errorf("revoke user session: %w", err)
	}
	if err := s.cache.Delete(ctx, tokenHash); err != nil {
		return false, fmt.Errorf("evict revoked session: %w", err)
	}
	revoked := updated.RowsAffected() == 1
	if revoked && currentSessionID(sessions) == sessionID {
		s.clearCookies(w)
	}
	return revoked, nil
}

func (s *UserSession) RevokeOtherSessions(ctx context.Context, r *http.Request, principal Principal) (int, error) {
	if err := requireSessionCaller(principal); err != nil {
		return 0, err
	}
	if principal.WorkspaceID == "" {
		return 0, nil
	}
	sessions, err := s.activeSessions(ctx, r, principal)
	if err != nil {
		return 0, err
	}
	var except *string
	if current := currentSessionID(sessions); current != "" {
		except = &current
	}
	rows, err := s.pool.Query(ctx,
		`UPDATE core."userSession" SET "revokedAt" = now(), "revokedReason" = $3, "updatedAt" = now()
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "revokedAt" IS NULL AND ($4::uuid IS NULL OR id != $4::uuid)
		 RETURNING "tokenHash"`,
		principal.UserID, principal.WorkspaceID, sessionRevokedUserRevoked, except)
	if err != nil {
		return 0, fmt.Errorf("revoke other user sessions: %w", err)
	}
	hashes, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return 0, fmt.Errorf("read revoked user sessions: %w", err)
	}
	if len(hashes) == 0 {
		return 0, nil
	}
	if err := s.cache.Delete(ctx, hashes...); err != nil {
		return 0, fmt.Errorf("evict revoked sessions: %w", err)
	}
	return len(hashes), nil
}

func requireSessionCaller(principal Principal) error {
	if principal.UserID == "" || principal.APIKeyID != "" {
		return newTwoFactorError("FORBIDDEN_EXCEPTION", "Forbidden resource")
	}
	return nil
}

func currentSessionID(sessions []SessionSummary) string {
	for _, session := range sessions {
		if session.IsCurrent {
			return session.ID
		}
	}
	return ""
}

func (s *UserSession) activeSessions(ctx context.Context, r *http.Request, principal Principal) ([]SessionSummary, error) {
	presentedHash := ""
	if token := s.sessionTokenFromRequest(r); token != "" {
		presentedHash = hashSessionToken(token)
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, "workspaceId"::text, "authProvider", "userAgent", "ipAddress", "createdAt", "lastActiveAt", "expiresAt", "tokenHash" = $3
		 FROM core."userSession"
		 WHERE "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "revokedAt" IS NULL AND "expiresAt" > now()
		   AND "lastActiveAt" > now() - make_interval(secs => $4)
		 ORDER BY "lastActiveAt" DESC`,
		principal.UserID, principal.WorkspaceID, presentedHash, s.config.IdleTimeout.Seconds())
	if err != nil {
		return nil, fmt.Errorf("list user sessions: %w", err)
	}
	sessions, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (SessionSummary, error) {
		var session SessionSummary
		err := row.Scan(&session.ID, &session.WorkspaceID, &session.AuthProvider, &session.UserAgent, &session.IPAddress,
			&session.CreatedAt, &session.LastActiveAt, &session.ExpiresAt, &session.IsCurrent)
		return session, err
	})
	if err != nil {
		return nil, fmt.Errorf("read user sessions: %w", err)
	}
	return sessions, nil
}
