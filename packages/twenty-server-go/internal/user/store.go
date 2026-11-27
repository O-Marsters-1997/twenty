package user

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type User struct {
	ID          string
	FirstName   string
	LastName    string
	Email       string
	HasPassword bool
}

type Workspace struct {
	ID                                string
	DisplayName                       *string
	LogoFileID                        *string
	LegacyLogo                        *string
	InviteHash                        *string
	AllowImpersonation                bool
	ActivationStatus                  string
	IsPublicInviteLinkEnabled         bool
	IsCampaignClickTrackingEnabled    bool
	IsCampaignOpenTrackingEnabled     bool
	WorkspaceDiscoverability          string
	IsGoogleAuthEnabled               bool
	IsPasswordAuthEnabled             bool
	IsGoogleAuthBypassEnabled         bool
	IsPasswordAuthBypassEnabled       bool
	Subdomain                         string
	WorkspaceCustomApplicationID      string
	DefaultRoleID                     *string
	AIChatModelTier                   string
	AIAgentModelTier                  string
	IsAutoModelSelectionEnabled       bool
	AIModelIDByTier                   map[string]any
	AIAdditionalInstructions          *string
	IsTwoFactorAuthenticationEnforced bool
	TrashRetentionDays                float64
	EventLogRetentionDays             float64
	EditableProfileFields             []string
	IsInternalMessagesImportEnabled   bool
}

type FeatureFlag struct {
	Key   string
	Value bool
}

type Config struct {
	GoogleAuthEnabled   bool
	PasswordAuthEnabled bool
	SupportHMACKey      string
}

type Store struct {
	pool   *pgxpool.Pool
	logins *auth.PasswordLogin
	config Config
}

func NewStore(pool *pgxpool.Pool, logins *auth.PasswordLogin, config Config) *Store {
	return &Store{pool: pool, logins: logins, config: config}
}

var userVarKeys = []string{"ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS", "ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES"}

func (s *Store) User(ctx context.Context, id string) (User, error) {
	var user User
	var passwordHash *string
	err := s.pool.QueryRow(ctx,
		`SELECT id::text, "firstName", "lastName", email::text, "passwordHash" FROM core."user" WHERE id = $1::uuid AND "deletedAt" IS NULL`, id,
	).Scan(&user.ID, &user.FirstName, &user.LastName, &user.Email, &passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, auth.ErrUnauthenticated
	}
	if err != nil {
		return User{}, fmt.Errorf("look up user: %w", err)
	}
	user.HasPassword = passwordHash != nil && *passwordHash != ""
	return user, nil
}

func (s *Store) Workspace(ctx context.Context, id string) (*Workspace, error) {
	var w Workspace
	err := s.pool.QueryRow(ctx, `SELECT id::text, "displayName", "logoFileId"::text, logo, "inviteHash", "allowImpersonation",
		"activationStatus"::text, "isPublicInviteLinkEnabled", "isCampaignClickTrackingEnabled", "isCampaignOpenTrackingEnabled",
		"workspaceDiscoverability"::text, "isGoogleAuthEnabled", "isPasswordAuthEnabled", "isGoogleAuthBypassEnabled",
		"isPasswordAuthBypassEnabled", subdomain, "workspaceCustomApplicationId"::text, "defaultRoleId"::text, "aiChatModelTier",
		"aiAgentModelTier", "isAutoModelSelectionEnabled", "aiModelIdByTier", "aiAdditionalInstructions",
		"isTwoFactorAuthenticationEnforced", "trashRetentionDays"::float8, "eventLogRetentionDays"::float8,
		"editableProfileFields"::text[], "isInternalMessagesImportEnabled"
		FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`, id).Scan(
		&w.ID, &w.DisplayName, &w.LogoFileID, &w.LegacyLogo, &w.InviteHash, &w.AllowImpersonation,
		&w.ActivationStatus, &w.IsPublicInviteLinkEnabled, &w.IsCampaignClickTrackingEnabled, &w.IsCampaignOpenTrackingEnabled,
		&w.WorkspaceDiscoverability, &w.IsGoogleAuthEnabled, &w.IsPasswordAuthEnabled, &w.IsGoogleAuthBypassEnabled,
		&w.IsPasswordAuthBypassEnabled, &w.Subdomain, &w.WorkspaceCustomApplicationID, &w.DefaultRoleID, &w.AIChatModelTier,
		&w.AIAgentModelTier, &w.IsAutoModelSelectionEnabled, &w.AIModelIDByTier, &w.AIAdditionalInstructions,
		&w.IsTwoFactorAuthenticationEnforced, &w.TrashRetentionDays, &w.EventLogRetentionDays,
		&w.EditableProfileFields, &w.IsInternalMessagesImportEnabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, auth.ErrUnauthenticated
	}
	if err != nil {
		return nil, fmt.Errorf("look up workspace: %w", err)
	}
	w.IsGoogleAuthEnabled = w.IsGoogleAuthEnabled && s.config.GoogleAuthEnabled
	w.IsPasswordAuthEnabled = w.IsPasswordAuthEnabled && s.config.PasswordAuthEnabled
	return &w, nil
}

func (s *Store) FeatureFlags(ctx context.Context, workspaceID string) ([]*FeatureFlag, error) {
	rows, err := s.pool.Query(ctx, `SELECT key, value FROM core."featureFlag" WHERE "workspaceId" = $1::uuid ORDER BY "createdAt", id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query feature flags: %w", err)
	}
	flags, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (*FeatureFlag, error) {
		var flag FeatureFlag
		err := row.Scan(&flag.Key, &flag.Value)
		return &flag, err
	})
	if err != nil {
		return nil, fmt.Errorf("read feature flags: %w", err)
	}
	return flags, nil
}

func (s *Store) MembersCount(ctx context.Context, workspaceID string) (float64, error) {
	var count float64
	err := s.pool.QueryRow(ctx, `SELECT count(*)::float8 FROM core."userWorkspace" WHERE "workspaceId" = $1::uuid AND "deletedAt" IS NULL`, workspaceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count workspace members: %w", err)
	}
	return count, nil
}

func (s *Store) UserVars(ctx context.Context, userID, workspaceID string) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, `SELECT key, value FROM core."keyValuePair"
		WHERE type = 'USER_VARIABLE' AND "userId" = $1::uuid AND "workspaceId" = $2::uuid AND "applicationId" IS NULL
			AND "deletedAt" IS NULL AND key = ANY($3)`, userID, workspaceID, userVarKeys)
	if err != nil {
		return nil, fmt.Errorf("query user vars: %w", err)
	}
	defer rows.Close()
	vars := map[string]any{}
	for rows.Next() {
		var key string
		var value any
		if err := rows.Scan(&key, &value); err != nil {
			return nil, fmt.Errorf("scan user var: %w", err)
		}
		vars[key] = value
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read user vars: %w", err)
	}
	return vars, nil
}

func (s *Store) OnboardingStatus(ctx context.Context, userID string, workspace *Workspace) (string, error) {
	if workspace.ActivationStatus == "PENDING_CREATION" || workspace.ActivationStatus == "ONGOING_CREATION" {
		return "WORKSPACE_ACTIVATION", nil
	}
	var profile, account, invite bool
	err := s.pool.QueryRow(ctx, `SELECT
		coalesce(bool_or(key = 'ONBOARDING_CREATE_PROFILE_PENDING' AND "userId" = $1::uuid), false),
		coalesce(bool_or(key = 'ONBOARDING_CONNECT_ACCOUNT_PENDING' AND "userId" = $1::uuid), false),
		coalesce(bool_or(key = 'ONBOARDING_INVITE_TEAM_PENDING' AND "userId" IS NULL), false)
		FROM core."keyValuePair"
		WHERE type = 'USER_VARIABLE' AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL AND value = 'true'::jsonb
			AND ("userId" = $1::uuid OR "userId" IS NULL)`, userID, workspace.ID).Scan(&profile, &account, &invite)
	if err != nil {
		return "", fmt.Errorf("look up onboarding steps: %w", err)
	}
	switch {
	case profile:
		return "PROFILE_CREATION", nil
	case account:
		return "SYNC_EMAIL", nil
	case invite:
		return "INVITE_TEAM", nil
	}
	return "COMPLETED", nil
}

func (s *Store) SupportUserHash(email string) *string {
	if s.config.SupportHMACKey == "" {
		return nil
	}
	mac := hmac.New(sha256.New, []byte(s.config.SupportHMACKey))
	mac.Write([]byte(email))
	hash := hex.EncodeToString(mac.Sum(nil))
	return &hash
}

func (s *Store) AvailableWorkspaces(ctx context.Context, userID string) (forSignIn, forSignUp []auth.AvailableWorkspace, err error) {
	return s.logins.AvailableWorkspacesForUser(ctx, userID)
}

func (s *Store) WorkspaceURL(subdomain string) string { return s.logins.WorkspaceURL(subdomain) }

func (s *Store) LogoURL(ctx context.Context, workspaceID, fileID string) (string, error) {
	return s.logins.LogoURL(ctx, workspaceID, fileID)
}
