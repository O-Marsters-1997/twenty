package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

var (
	ErrPermissionDenied = errors.New("entity performing the request does not have permission")
	ErrDomainNotFound   = errors.New("approved access domain not found")
	ErrInvalidID        = errors.New("id must be a UUID")

	ErrDomainMismatch   = errors.New("approved access domain does not match email")
	ErrDomainNotCompany = errors.New("approved access domain must be a company domain")
	ErrDomainRegistered = errors.New("approved access domain already registered")
)

type Invitation struct {
	ID        string
	Email     string
	RoleID    *string
	ExpiresAt time.Time
}

type ApprovedDomain struct {
	ID          string
	Domain      string
	IsValidated bool
	CreatedAt   time.Time
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// AuthorizeMembers allows a user whose role can update all settings or holds the WORKSPACE_MEMBERS flag.
func (s *Store) AuthorizeMembers(ctx context.Context, workspaceID, userWorkspaceID string) error {
	var granted bool
	if err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(bool_and(r."canUpdateAllSettings" OR EXISTS (
		     SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
		     WHERE rpf."roleId" = r.id AND pf.key = 'WORKSPACE_MEMBERS')), false)
		 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		 WHERE rt."userWorkspaceId" = NULLIF($1, '')::uuid AND rt."workspaceId" = $2::uuid`,
		userWorkspaceID, workspaceID,
	).Scan(&granted); err != nil {
		return fmt.Errorf("look up members permission: %w", err)
	}
	if !granted {
		return ErrPermissionDenied
	}
	return nil
}

const invitationTypes = `type IN ('INVITATION_TOKEN', 'ONBOARDING_INVITATION_TOKEN')`

func (s *Store) Invitations(ctx context.Context, workspaceID string) ([]Invitation, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, context->>'email', NULLIF(context->>'roleId', ''), "expiresAt" FROM core."appToken"
		 WHERE "workspaceId" = $1::uuid AND `+invitationTypes+` AND "deletedAt" IS NULL AND context->>'email' <> ''
		 ORDER BY "createdAt", id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query invitations: %w", err)
	}
	defer rows.Close()
	invitations := []Invitation{}
	for rows.Next() {
		var invitation Invitation
		if err := rows.Scan(&invitation.ID, &invitation.Email, &invitation.RoleID, &invitation.ExpiresAt); err != nil {
			return nil, fmt.Errorf("scan invitation: %w", err)
		}
		invitations = append(invitations, invitation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read invitations: %w", err)
	}
	return invitations, nil
}

// DeleteInvitation reports whether an invitation of this workspace was removed.
func (s *Store) DeleteInvitation(ctx context.Context, workspaceID, appTokenID string) (bool, error) {
	if _, err := uuid.Parse(appTokenID); err != nil {
		return false, nil
	}
	result, err := s.pool.Exec(ctx,
		`DELETE FROM core."appToken" WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND `+invitationTypes,
		appTokenID, workspaceID)
	if err != nil {
		return false, fmt.Errorf("delete invitation: %w", err)
	}
	return result.RowsAffected() == 1, nil
}

func (s *Store) ApprovedDomains(ctx context.Context, workspaceID string) ([]ApprovedDomain, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id::text, domain, "isValidated", "createdAt" FROM core."approvedAccessDomain"
		 WHERE "workspaceId" = $1::uuid ORDER BY "createdAt", id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query approved access domains: %w", err)
	}
	defer rows.Close()
	domains := []ApprovedDomain{}
	for rows.Next() {
		var domain ApprovedDomain
		if err := rows.Scan(&domain.ID, &domain.Domain, &domain.IsValidated, &domain.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan approved access domain: %w", err)
		}
		domains = append(domains, domain)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read approved access domains: %w", err)
	}
	return domains, nil
}

func (s *Store) CreateApprovedDomain(ctx context.Context, workspaceID, domain, email string) (ApprovedDomain, error) {
	domain = strings.ToLower(domain)
	if !emailInDomain(email, domain) {
		return ApprovedDomain{}, ErrDomainMismatch
	}
	if auth.IsPublicEmailDomain(domain) {
		return ApprovedDomain{}, ErrDomainNotCompany
	}
	var created ApprovedDomain
	err := s.pool.QueryRow(ctx,
		`INSERT INTO core."approvedAccessDomain" (domain, "workspaceId") VALUES ($1, $2::uuid)
		 ON CONFLICT (domain, "workspaceId") DO NOTHING
		 RETURNING id::text, domain, "isValidated", "createdAt"`, domain, workspaceID,
	).Scan(&created.ID, &created.Domain, &created.IsValidated, &created.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ApprovedDomain{}, ErrDomainRegistered
	}
	if err != nil {
		return ApprovedDomain{}, fmt.Errorf("create approved access domain: %w", err)
	}
	return created, nil
}

func (s *Store) ValidateApprovedDomain(ctx context.Context, workspaceID, id, email string) (ApprovedDomain, error) {
	if _, err := uuid.Parse(id); err != nil {
		return ApprovedDomain{}, ErrInvalidID
	}
	var domain ApprovedDomain
	err := s.pool.QueryRow(ctx,
		`SELECT id::text, domain, "isValidated", "createdAt" FROM core."approvedAccessDomain"
		 WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspaceID,
	).Scan(&domain.ID, &domain.Domain, &domain.IsValidated, &domain.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ApprovedDomain{}, ErrDomainNotFound
	}
	if err != nil {
		return ApprovedDomain{}, fmt.Errorf("look up approved access domain: %w", err)
	}
	if !emailInDomain(email, domain.Domain) {
		return ApprovedDomain{}, ErrDomainMismatch
	}
	if _, err := s.pool.Exec(ctx, `UPDATE core."approvedAccessDomain" SET "isValidated" = true, "updatedAt" = now() WHERE id = $1::uuid`, id); err != nil {
		return ApprovedDomain{}, fmt.Errorf("validate approved access domain: %w", err)
	}
	domain.IsValidated = true
	return domain, nil
}

func emailInDomain(email, domain string) bool {
	return strings.HasSuffix(strings.ToLower(email), "@"+strings.ToLower(domain))
}

func (s *Store) DeleteApprovedDomain(ctx context.Context, workspaceID, id string) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrInvalidID
	}
	result, err := s.pool.Exec(ctx,
		`DELETE FROM core."approvedAccessDomain" WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspaceID)
	if err != nil {
		return fmt.Errorf("delete approved access domain: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrDomainNotFound
	}
	return nil
}
