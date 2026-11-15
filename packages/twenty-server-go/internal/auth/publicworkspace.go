package auth

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const subdomainSuggestionCount = 3

var ErrInviteHashNotFound = errors.New("auth: no workspace for this invite hash")

type PublicWorkspaceConfig struct {
	GoogleEnabled    bool
	PasswordEnabled  bool
	DefaultSubdomain string
}

type PublicWorkspaces struct {
	pool    *pgxpool.Pool
	origins *OriginResolver
	login   *PasswordLogin
	config  PublicWorkspaceConfig
}

func NewPublicWorkspaces(pool *pgxpool.Pool, origins *OriginResolver, login *PasswordLogin, config PublicWorkspaceConfig) *PublicWorkspaces {
	return &PublicWorkspaces{pool: pool, origins: origins, login: login, config: config}
}

type AuthProviders struct {
	Google    bool
	MagicLink bool
	Password  bool
}

type AuthBypassProviders struct {
	Google   bool
	Password bool
}

type PublicWorkspace struct {
	ID                  string
	Logo                string
	DisplayName         *string
	SubdomainURL        string
	AuthProviders       AuthProviders
	AuthBypassProviders AuthBypassProviders
}

type InviteWorkspace struct {
	ID                 string
	Logo               string
	DisplayName        *string
	AllowImpersonation bool
}

type UserExists struct {
	Exists                   bool
	AvailableWorkspacesCount int
	IsEmailVerified          bool
}

type SubdomainAvailability struct {
	IsValid             bool
	Available           bool
	SuggestedSubdomain  string
	SuggestedSubdomains []string
}

type WorkspaceCreationDefaults struct {
	DisplayName string
	Subdomain   string
}

type publicWorkspaceRow struct {
	id                    string
	displayName           *string
	subdomain             string
	logo                  *string
	logoFileID            *string
	googleEnabled         bool
	passwordEnabled       bool
	googleBypassEnabled   bool
	passwordBypassEnabled bool
	allowImpersonation    bool
}

const publicWorkspaceColumns = `id::text, "displayName", subdomain, logo, "logoFileId"::text, "isGoogleAuthEnabled", "isPasswordAuthEnabled",
	"isGoogleAuthBypassEnabled", "isPasswordAuthBypassEnabled", "allowImpersonation"`

func (p *PublicWorkspaces) ByOrigin(ctx context.Context, origin string) (PublicWorkspace, error) {
	found, err := p.origins.ByOriginOrDefault(ctx, origin)
	if err != nil {
		return PublicWorkspace{}, fmt.Errorf("resolve workspace origin: %w", err)
	}
	row, err := p.row(ctx, `id = $1::uuid`, found.ID)
	if err != nil {
		return PublicWorkspace{}, err
	}
	logo, err := p.signedLogo(ctx, row)
	if err != nil {
		return PublicWorkspace{}, err
	}
	return PublicWorkspace{
		ID:           row.id,
		Logo:         logo,
		DisplayName:  row.displayName,
		SubdomainURL: p.login.workspaceURL(row.subdomain),
		AuthProviders: AuthProviders{
			Google:   row.googleEnabled && p.config.GoogleEnabled,
			Password: row.passwordEnabled && p.config.PasswordEnabled,
		},
		AuthBypassProviders: AuthBypassProviders{
			Google:   row.googleBypassEnabled && p.config.GoogleEnabled,
			Password: row.passwordBypassEnabled && p.config.PasswordEnabled,
		},
	}, nil
}

func (p *PublicWorkspaces) ByID(ctx context.Context, id string) (InviteWorkspace, error) {
	row, err := p.row(ctx, `id = $1::uuid`, id)
	if err != nil {
		return InviteWorkspace{}, err
	}
	logo, err := p.signedLogo(ctx, row)
	if err != nil {
		return InviteWorkspace{}, err
	}
	if row.logoFileID == nil && row.logo != nil {
		logo = *row.logo
	}
	return InviteWorkspace{ID: row.id, Logo: logo, DisplayName: row.displayName, AllowImpersonation: row.allowImpersonation}, nil
}

func (p *PublicWorkspaces) ByInviteHash(ctx context.Context, inviteHash string) (InviteWorkspace, error) {
	row, err := p.row(ctx, `"inviteHash" = $1`, inviteHash)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return InviteWorkspace{}, ErrInviteHashNotFound
	}
	if err != nil {
		return InviteWorkspace{}, err
	}
	logo, err := p.signedLogo(ctx, row)
	if err != nil {
		return InviteWorkspace{}, err
	}
	return InviteWorkspace{ID: row.id, Logo: logo, DisplayName: row.displayName, AllowImpersonation: row.allowImpersonation}, nil
}

func (p *PublicWorkspaces) AllowedIframeOrigins(ctx context.Context, workspaceID string) ([]string, error) {
	var origins []string
	err := p.pool.QueryRow(ctx, `SELECT "allowedIframeOrigins" FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`, workspaceID).Scan(&origins)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrWorkspaceNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("look up allowed iframe origins: %w", err)
	}
	return origins, nil
}

func (p *PublicWorkspaces) UserExists(ctx context.Context, email string) (UserExists, error) {
	email = strings.ToLower(email)
	var userID string
	var verified bool
	err := p.pool.QueryRow(ctx,
		`SELECT id::text, "isEmailVerified" FROM core."user" WHERE lower(email::text) = $1 AND "deletedAt" IS NULL`, email,
	).Scan(&userID, &verified)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return UserExists{}, fmt.Errorf("look up user: %w", err)
	}
	members, joinable, invitations, err := p.login.discoverWorkspaces(ctx, userID, email)
	if err != nil {
		return UserExists{}, err
	}
	return UserExists{
		Exists:                   userID != "",
		AvailableWorkspacesCount: len(members) + len(joinable) + len(invitations),
		IsEmailVerified:          verified,
	}, nil
}

func (p *PublicWorkspaces) SubdomainAvailability(ctx context.Context, subdomain string) (SubdomainAvailability, error) {
	valid := workspace.IsValidSubdomain(subdomain)
	free, err := p.freeSubdomains(ctx, []string{subdomain})
	if err != nil {
		return SubdomainAvailability{}, err
	}
	available := len(free) == 1
	suggestions := []string{subdomain}
	if !available {
		var err error
		if suggestions, err = p.availableSubdomains(ctx, subdomain, subdomainSuggestionCount); err != nil {
			return SubdomainAvailability{}, err
		}
	}
	return SubdomainAvailability{IsValid: valid, Available: available, SuggestedSubdomain: suggestions[0], SuggestedSubdomains: suggestions}, nil
}

func (p *PublicWorkspaces) CreationDefaults(ctx context.Context, userID string) (WorkspaceCreationDefaults, error) {
	var email string
	if err := p.pool.QueryRow(ctx, `SELECT email::text FROM core."user" WHERE id = $1::uuid AND "deletedAt" IS NULL`, userID).Scan(&email); err != nil {
		return WorkspaceCreationDefaults{}, fmt.Errorf("look up user email: %w", err)
	}
	base, ok := workspace.SubdomainFromEmail(email)
	if !ok {
		return WorkspaceCreationDefaults{}, nil
	}
	suggestions, err := p.availableSubdomains(ctx, base, 1)
	if err != nil {
		return WorkspaceCreationDefaults{}, err
	}
	return WorkspaceCreationDefaults{DisplayName: strings.ToUpper(base[:1]) + base[1:], Subdomain: suggestions[0]}, nil
}

func (p *PublicWorkspaces) freeSubdomains(ctx context.Context, candidates []string) ([]string, error) {
	valid := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		if workspace.IsValidSubdomain(candidate) && candidate != p.config.DefaultSubdomain {
			valid = append(valid, candidate)
		}
	}
	if len(valid) == 0 {
		return nil, nil
	}
	rows, err := p.pool.Query(ctx, `SELECT subdomain FROM core.workspace WHERE subdomain = ANY($1)`, valid)
	if err != nil {
		return nil, fmt.Errorf("query taken subdomains: %w", err)
	}
	taken, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, fmt.Errorf("read taken subdomains: %w", err)
	}
	return slices.DeleteFunc(valid, func(candidate string) bool { return slices.Contains(taken, candidate) }), nil
}

func (p *PublicWorkspaces) availableSubdomains(ctx context.Context, desired string, count int) ([]string, error) {
	base := desired
	if !workspace.IsValidSubdomain(base) {
		base = workspace.SubdomainSlug(desired)
	}
	if !workspace.IsValidSubdomain(base) {
		base = workspace.RandomSubdomain()
	}
	free, err := p.freeSubdomains(ctx, workspace.SubdomainCandidates(base))
	if err != nil {
		return nil, err
	}
	if len(free) == 0 {
		return []string{workspace.RandomSubdomain()}, nil
	}
	return free[:min(count, len(free))], nil
}

func (p *PublicWorkspaces) row(ctx context.Context, condition string, argument string) (publicWorkspaceRow, error) {
	var row publicWorkspaceRow
	err := p.pool.QueryRow(ctx, `SELECT `+publicWorkspaceColumns+` FROM core.workspace WHERE `+condition+` AND "deletedAt" IS NULL LIMIT 1`, argument).Scan(
		&row.id, &row.displayName, &row.subdomain, &row.logo, &row.logoFileID, &row.googleEnabled, &row.passwordEnabled,
		&row.googleBypassEnabled, &row.passwordBypassEnabled, &row.allowImpersonation)
	if errors.Is(err, pgx.ErrNoRows) {
		return publicWorkspaceRow{}, ErrWorkspaceNotFound
	}
	if err != nil {
		return publicWorkspaceRow{}, fmt.Errorf("look up workspace: %w", err)
	}
	return row, nil
}

func (p *PublicWorkspaces) signedLogo(ctx context.Context, row publicWorkspaceRow) (string, error) {
	if row.logoFileID == nil {
		return "", nil
	}
	token, err := p.login.issuer.IssueFileToken(ctx, row.id, *row.logoFileID, p.login.config.FileTokenTTL)
	if err != nil {
		return "", fmt.Errorf("sign workspace logo: %w", err)
	}
	return fmt.Sprintf("%s/file/%s/%s?token=%s", p.login.config.ServerURL, fileFolderCorePicture, *row.logoFileID, token), nil
}
