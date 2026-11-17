package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const noUserID = "00000000-0000-0000-0000-000000000000"

type PublicDataConfig struct {
	GoogleAuthEnabled   bool
	PasswordAuthEnabled bool
	DefaultSubdomain    string
}

type PublicData struct {
	pool   *pgxpool.Pool
	login  *PasswordLogin
	config PublicDataConfig
}

func NewPublicData(pool *pgxpool.Pool, login *PasswordLogin, config PublicDataConfig) *PublicData {
	return &PublicData{pool: pool, login: login, config: config}
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
	AllowImpersonation  bool
	AuthProviders       AuthProviders
	AuthBypassProviders *AuthBypassProviders
}

type UserExistence struct {
	Exists                   bool
	AvailableWorkspacesCount int
	IsEmailVerified          bool
}

type publicWorkspaceRow struct {
	PublicWorkspace
	subdomain    string
	logoFileID   *string
	legacyLogo   *string
	googleAuth   bool
	passwordAuth bool
	googleBypass bool
	passBypass   bool
}

func workspaceMissing() error {
	return &LoginError{Code: "NOT_FOUND", SubCode: "WORKSPACE_NOT_FOUND", Message: "Workspace not found", FriendlyMessage: "Workspace not found."}
}

func inviteHashUnknown() error {
	return &LoginError{Code: "BAD_USER_INPUT", SubCode: "INVALID_INPUT", Message: "Workspace does not exist", FriendlyMessage: "Workspace does not exist."}
}

const publicWorkspaceSelect = `SELECT id::text, "displayName", subdomain, "logoFileId"::text, logo, "allowImpersonation",
	"isGoogleAuthEnabled", "isPasswordAuthEnabled", "isGoogleAuthBypassEnabled", "isPasswordAuthBypassEnabled"
	FROM core.workspace WHERE "deletedAt" IS NULL AND `

func (p *PublicData) findWorkspace(ctx context.Context, condition string, arg any) (publicWorkspaceRow, error) {
	var row publicWorkspaceRow
	err := p.pool.QueryRow(ctx, publicWorkspaceSelect+condition, arg).Scan(
		&row.ID, &row.DisplayName, &row.subdomain, &row.logoFileID, &row.legacyLogo, &row.AllowImpersonation,
		&row.googleAuth, &row.passwordAuth, &row.googleBypass, &row.passBypass,
	)
	if err != nil {
		return publicWorkspaceRow{}, err
	}
	row.SubdomainURL = p.login.workspaceURL(row.subdomain)
	return row, nil
}

func (p *PublicData) withSignedLogo(ctx context.Context, row publicWorkspaceRow) (PublicWorkspace, error) {
	workspace := row.PublicWorkspace
	if row.logoFileID != nil {
		logo, err := p.login.logoURL(ctx, row.ID, *row.logoFileID)
		if err != nil {
			return PublicWorkspace{}, err
		}
		workspace.Logo = logo
	}
	return workspace, nil
}

func (p *PublicData) ByOrigin(ctx context.Context, origin, originHeader string) (PublicWorkspace, error) {
	system := AuthProviders{Google: p.config.GoogleAuthEnabled, Password: p.config.PasswordAuthEnabled}
	if origin == "" {
		displayName := "Default Workspace"
		return PublicWorkspace{ID: "default-workspace", DisplayName: &displayName, SubdomainURL: originHeader, AuthProviders: system}, nil
	}
	found, err := p.login.origins.ByOriginOrDefault(ctx, origin)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return PublicWorkspace{}, workspaceMissing()
	}
	if err != nil {
		return PublicWorkspace{}, fmt.Errorf("resolve workspace: %w", err)
	}
	row, err := p.findWorkspace(ctx, `id = $1::uuid`, found.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return PublicWorkspace{}, workspaceMissing()
	}
	if err != nil {
		return PublicWorkspace{}, fmt.Errorf("look up workspace: %w", err)
	}
	workspace, err := p.withSignedLogo(ctx, row)
	if err != nil {
		return PublicWorkspace{}, err
	}
	workspace.AuthProviders = AuthProviders{Google: row.googleAuth && system.Google, Password: row.passwordAuth && system.Password}
	workspace.AuthBypassProviders = &AuthBypassProviders{Google: row.googleBypass && system.Google, Password: row.passBypass && system.Password}
	return workspace, nil
}

func (p *PublicData) ByID(ctx context.Context, id string) (PublicWorkspace, error) {
	row, err := p.findWorkspace(ctx, `id = $1::uuid`, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return PublicWorkspace{}, workspaceMissing()
	}
	if err != nil {
		return PublicWorkspace{}, fmt.Errorf("look up workspace: %w", err)
	}
	workspace, err := p.withSignedLogo(ctx, row)
	if err != nil {
		return PublicWorkspace{}, err
	}
	if row.logoFileID == nil && row.legacyLogo != nil {
		workspace.Logo = *row.legacyLogo
	}
	return workspace, nil
}

func (p *PublicData) ByInviteHash(ctx context.Context, inviteHash string) (PublicWorkspace, error) {
	row, err := p.findWorkspace(ctx, `"inviteHash" = $1`, inviteHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return PublicWorkspace{}, inviteHashUnknown()
	}
	if err != nil {
		return PublicWorkspace{}, fmt.Errorf("look up workspace: %w", err)
	}
	return p.withSignedLogo(ctx, row)
}

func (p *PublicData) UserExists(ctx context.Context, email string) (UserExistence, error) {
	email = strings.ToLower(email)
	user := loginUser{id: noUserID, email: email}
	var existence UserExistence
	found, err := p.login.findUser(ctx, email)
	var loginErr *LoginError
	switch {
	case err == nil:
		user = found
		existence = UserExistence{Exists: true, IsEmailVerified: found.verified}
	case !errors.As(err, &loginErr) || loginErr.SubCode != "USER_NOT_FOUND":
		return UserExistence{}, err
	}
	members, signUp, err := p.login.availableWorkspaceRows(ctx, user)
	if err != nil {
		return UserExistence{}, err
	}
	existence.AvailableWorkspacesCount = len(members) + len(signUp)
	return existence, nil
}

func (p *PublicData) IframeOrigins(ctx context.Context, workspaceID string) ([]string, error) {
	var origins []string
	err := p.pool.QueryRow(ctx, `SELECT "allowedIframeOrigins"::text[] FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`, workspaceID).Scan(&origins)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, workspaceMissing()
	}
	if err != nil {
		return nil, fmt.Errorf("look up iframe origins: %w", err)
	}
	return origins, nil
}
