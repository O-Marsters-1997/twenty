package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var errCurrentUserWorkspaceNotFound = errors.New("current user workspace not found")

var exposedUserVars = []string{
	"ONBOARDING_CONNECT_ACCOUNT_PENDING",
	"ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS",
	"ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES",
}

var sharedFeatureFlagKeys = []string{
	"IS_APPLICATION_WORKFLOWS_ENABLED", "IS_ASYNC_CSV_EXPORT_ENABLED", "IS_CONFIGURABLE_SEARCH_FIELDS_ENABLED",
	"IS_JSON_FILTER_ENABLED", "IS_MESSAGE_CAMPAIGN_ENABLED", "IS_REST_METADATA_API_NEW_FORMAT_DIRECT",
	"IS_INITIAL_OBJECT_VIEW_ENABLED", "IS_DEFERRED_WORKSPACE_MIGRATION_ACTIONS_ENABLED", "IS_RECORD_CREATION_FORM_ENABLED",
	"IS_LOGS_SETTINGS_SECTION_ENABLED", "IS_VALIDATION_RULES_ENABLED", "IS_RECORD_LEVEL_SHARING_ENABLED",
	"IS_CALENDAR_SYNC_SKIP_UNCHANGED_RECORDS_ENABLED", "IS_RECORD_SHARE_VISIBILITY_GATING_ENABLED",
	"IS_AI_CHAT_INBOX_ENABLED", "IS_APP_PREFERENCES_ENABLED",
}

type CurrentUserConfig struct {
	ServerURL           string
	PasswordAuthEnabled bool
	GoogleAuthEnabled   bool
	SupportHMACKey      string
}

type CurrentUser struct {
	pool   *pgxpool.Pool
	login  *PasswordLogin
	config CurrentUserConfig
}

func NewCurrentUser(pool *pgxpool.Pool, login *PasswordLogin, config CurrentUserConfig) *CurrentUser {
	return &CurrentUser{pool: pool, login: login, config: config}
}

type CurrentUserApplication struct {
	ID                  string
	Name                string
	UniversalIdentifier string
	LogoURL             *string
	CreatedAt           time.Time
}

type CurrentUserRole struct {
	ID                            string
	Label                         string
	Description                   *string
	Icon                          *string
	CanUpdateAllSettings          bool
	CanAccessAllTools             bool
	IsEditable                    bool
	CanReadAllObjectRecords       bool
	CanUpdateAllObjectRecords     bool
	CanSoftDeleteAllObjectRecords bool
	CanDestroyAllObjectRecords    bool
	CanBeAssignedToUsers          bool
	CanBeAssignedToAgents         bool
	CanBeAssignedToAPIKeys        bool
}

type CurrentUserFeatureFlag struct {
	Key   string
	Value bool
}

type CurrentUserWorkspace struct {
	ID                                string
	DisplayName                       *string
	InviteHash                        *string
	AIAdditionalInstructions          *string
	Logo                              string
	ActivationStatus                  string
	WorkspaceDiscoverability          string
	Subdomain                         string
	SubdomainURL                      string
	AIChatModelTier                   string
	AIAgentModelTier                  string
	AIModelIDByTier                   any
	EditableProfileFields             []string
	AllowImpersonation                bool
	IsPublicInviteLinkEnabled         bool
	IsCampaignClickTrackingEnabled    bool
	IsCampaignOpenTrackingEnabled     bool
	IsGoogleAuthEnabled               bool
	IsPasswordAuthEnabled             bool
	IsGoogleAuthBypassEnabled         bool
	IsPasswordAuthBypassEnabled       bool
	IsAutoModelSelectionEnabled       bool
	IsTwoFactorAuthenticationEnforced bool
	IsInternalMessagesImportEnabled   bool
	TrashRetentionDays                int
	EventLogRetentionDays             int
	WorkspaceMembersCount             int
	CustomApplication                 *CurrentUserApplication
	InstalledApplications             []CurrentUserApplication
	FeatureFlags                      []CurrentUserFeatureFlag
	DefaultRole                       *CurrentUserRole
}

type CurrentUserData struct {
	ID                 string
	FirstName          string
	LastName           string
	Email              string
	HasPassword        bool
	SupportUserHash    *string
	OnboardingStatus   *string
	UserVars           map[string]any
	Workspace          *CurrentUserWorkspace
	AvailableForSignIn []AvailableWorkspace
	AvailableForSignUp []AvailableWorkspace
}

func (c *CurrentUser) Load(ctx context.Context, principal Principal) (CurrentUserData, error) {
	if principal.UserID == "" || principal.APIKeyID != "" {
		return CurrentUserData{}, ErrUnauthenticated
	}
	var data CurrentUserData
	err := c.pool.QueryRow(ctx,
		`SELECT id::text, "firstName", "lastName", email::text, "passwordHash" IS NOT NULL FROM core."user" WHERE id = $1 AND "deletedAt" IS NULL`,
		principal.UserID,
	).Scan(&data.ID, &data.FirstName, &data.LastName, &data.Email, &data.HasPassword)
	if errors.Is(err, pgx.ErrNoRows) {
		return CurrentUserData{}, ErrUnauthenticated
	}
	if err != nil {
		return CurrentUserData{}, fmt.Errorf("load user: %w", err)
	}
	if c.config.SupportHMACKey != "" {
		mac := hmac.New(sha256.New, []byte(c.config.SupportHMACKey))
		mac.Write([]byte(data.Email))
		hash := hex.EncodeToString(mac.Sum(nil))
		data.SupportUserHash = &hash
	}

	data.UserVars = map[string]any{}
	if principal.WorkspaceID != "" {
		if err := c.loadWorkspace(ctx, principal, &data); err != nil {
			return CurrentUserData{}, err
		}
		vars, err := c.mergedUserVars(ctx, principal.UserID, principal.WorkspaceID)
		if err != nil {
			return CurrentUserData{}, err
		}
		status := onboardingStatus(data.Workspace.ActivationStatus, vars)
		data.OnboardingStatus = &status
		maps.DeleteFunc(vars, func(key string, _ any) bool { return !slices.Contains(exposedUserVars, key) })
		data.UserVars = vars
	}

	data.AvailableForSignIn, data.AvailableForSignUp, err = c.login.availableWorkspaces(ctx, loginUser{id: data.ID, email: data.Email})
	if err != nil {
		return CurrentUserData{}, err
	}
	if principal.AuthProvider != passwordProvider {
		for index := range data.AvailableForSignIn {
			data.AvailableForSignIn[index].LoginToken = nil
		}
	}
	return data, nil
}

func (c *CurrentUser) loadWorkspace(ctx context.Context, principal Principal, data *CurrentUserData) error {
	workspace := &CurrentUserWorkspace{}
	var logoFileID, defaultRoleID *string
	var customApplicationID string
	var passwordAuth, googleAuth bool
	err := c.pool.QueryRow(ctx,
		`SELECT w.id::text, w."displayName", w."inviteHash", w."aiAdditionalInstructions", w."logoFileId"::text, w."activationStatus"::text,
		        w."workspaceDiscoverability"::text, w.subdomain, w."aiChatModelTier", w."aiAgentModelTier", w."aiModelIdByTier",
		        COALESCE(w."editableProfileFields", '{}'), w."allowImpersonation", w."isPublicInviteLinkEnabled",
		        w."isCampaignClickTrackingEnabled", w."isCampaignOpenTrackingEnabled", w."isGoogleAuthEnabled", w."isPasswordAuthEnabled",
		        w."isGoogleAuthBypassEnabled", w."isPasswordAuthBypassEnabled", w."isAutoModelSelectionEnabled",
		        w."isTwoFactorAuthenticationEnforced", w."isInternalMessagesImportEnabled", w."trashRetentionDays", w."eventLogRetentionDays",
		        w."defaultRoleId"::text, w."workspaceCustomApplicationId"::text,
		        (SELECT count(*) FROM core."userWorkspace" m WHERE m."workspaceId" = w.id AND m."deletedAt" IS NULL)
		 FROM core.workspace w
		 WHERE w.id = $2 AND w."deletedAt" IS NULL
		   AND EXISTS (SELECT 1 FROM core."userWorkspace" uw WHERE uw."userId" = $1 AND uw."workspaceId" = w.id AND uw."deletedAt" IS NULL)`,
		principal.UserID, principal.WorkspaceID,
	).Scan(&workspace.ID, &workspace.DisplayName, &workspace.InviteHash, &workspace.AIAdditionalInstructions, &logoFileID,
		&workspace.ActivationStatus, &workspace.WorkspaceDiscoverability, &workspace.Subdomain, &workspace.AIChatModelTier,
		&workspace.AIAgentModelTier, &workspace.AIModelIDByTier, &workspace.EditableProfileFields, &workspace.AllowImpersonation,
		&workspace.IsPublicInviteLinkEnabled, &workspace.IsCampaignClickTrackingEnabled, &workspace.IsCampaignOpenTrackingEnabled,
		&googleAuth, &passwordAuth, &workspace.IsGoogleAuthBypassEnabled, &workspace.IsPasswordAuthBypassEnabled,
		&workspace.IsAutoModelSelectionEnabled, &workspace.IsTwoFactorAuthenticationEnforced, &workspace.IsInternalMessagesImportEnabled,
		&workspace.TrashRetentionDays, &workspace.EventLogRetentionDays, &defaultRoleID, &customApplicationID, &workspace.WorkspaceMembersCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return errCurrentUserWorkspaceNotFound
	}
	if err != nil {
		return fmt.Errorf("load workspace: %w", err)
	}
	workspace.IsGoogleAuthEnabled = googleAuth && c.config.GoogleAuthEnabled
	workspace.IsPasswordAuthEnabled = passwordAuth && c.config.PasswordAuthEnabled
	workspace.SubdomainURL = c.login.workspaceURL(workspace.Subdomain)
	if logoFileID != nil {
		token, err := c.login.issuer.IssueFileToken(ctx, workspace.ID, *logoFileID, c.login.config.FileTokenTTL)
		if err != nil {
			return err
		}
		workspace.Logo = fmt.Sprintf("%s/file/%s/%s?token=%s", c.config.ServerURL, fileFolderCorePicture, *logoFileID, token)
	}

	if workspace.InstalledApplications, err = c.applications(ctx, workspace.ID); err != nil {
		return err
	}
	for index, application := range workspace.InstalledApplications {
		if application.ID == customApplicationID {
			workspace.CustomApplication = &workspace.InstalledApplications[index]
		}
	}
	if workspace.FeatureFlags, err = c.featureFlags(ctx, workspace.ID); err != nil {
		return err
	}
	if defaultRoleID != nil {
		if workspace.DefaultRole, err = c.role(ctx, workspace.ID, *defaultRoleID); err != nil {
			return err
		}
	}
	data.Workspace = workspace
	return nil
}

func (c *CurrentUser) applications(ctx context.Context, workspaceID string) ([]CurrentUserApplication, error) {
	rows, err := c.pool.Query(ctx,
		`SELECT id::text, name, "universalIdentifier"::text, logo, "createdAt" FROM core.application
		 WHERE "workspaceId" = $1 AND "deletedAt" IS NULL ORDER BY "createdAt", id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query applications: %w", err)
	}
	applications, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (CurrentUserApplication, error) {
		var application CurrentUserApplication
		var logo *string
		err := row.Scan(&application.ID, &application.Name, &application.UniversalIdentifier, &logo, &application.CreatedAt)
		application.LogoURL = c.publicAssetLogoURL(logo, workspaceID, application.ID)
		return application, err
	})
	if err != nil {
		return nil, fmt.Errorf("read applications: %w", err)
	}
	return applications, nil
}

func (c *CurrentUser) publicAssetLogoURL(logo *string, workspaceID, applicationID string) *string {
	if logo == nil || *logo == "" {
		return nil
	}
	if strings.Contains(*logo, "://") {
		return logo
	}
	url := fmt.Sprintf("%s/public-assets/%s/%s/%s", c.config.ServerURL, workspaceID, applicationID, *logo)
	return &url
}

func (c *CurrentUser) featureFlags(ctx context.Context, workspaceID string) ([]CurrentUserFeatureFlag, error) {
	rows, err := c.pool.Query(ctx,
		`SELECT key, value FROM core."featureFlag" WHERE "workspaceId" = $1 AND key = ANY($2) ORDER BY key`, workspaceID, sharedFeatureFlagKeys)
	if err != nil {
		return nil, fmt.Errorf("query feature flags: %w", err)
	}
	flags, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (CurrentUserFeatureFlag, error) {
		var flag CurrentUserFeatureFlag
		err := row.Scan(&flag.Key, &flag.Value)
		return flag, err
	})
	if err != nil {
		return nil, fmt.Errorf("read feature flags: %w", err)
	}
	return flags, nil
}

func (c *CurrentUser) role(ctx context.Context, workspaceID, roleID string) (*CurrentUserRole, error) {
	var role CurrentUserRole
	err := c.pool.QueryRow(ctx,
		`SELECT id::text, label, description, icon, "canUpdateAllSettings", "canAccessAllTools", "isEditable",
		        "canReadAllObjectRecords", "canUpdateAllObjectRecords", "canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords",
		        "canBeAssignedToUsers", "canBeAssignedToAgents", "canBeAssignedToApiKeys"
		 FROM core.role WHERE id = $1 AND "workspaceId" = $2`, roleID, workspaceID,
	).Scan(&role.ID, &role.Label, &role.Description, &role.Icon, &role.CanUpdateAllSettings, &role.CanAccessAllTools, &role.IsEditable,
		&role.CanReadAllObjectRecords, &role.CanUpdateAllObjectRecords, &role.CanSoftDeleteAllObjectRecords, &role.CanDestroyAllObjectRecords,
		&role.CanBeAssignedToUsers, &role.CanBeAssignedToAgents, &role.CanBeAssignedToAPIKeys)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load default role: %w", err)
	}
	return &role, nil
}

func (c *CurrentUser) mergedUserVars(ctx context.Context, userID, workspaceID string) (map[string]any, error) {
	rows, err := c.pool.Query(ctx,
		`SELECT key, value FROM core."keyValuePair"
		 WHERE type = 'USER_VARIABLE' AND "deletedAt" IS NULL
		   AND (("userId" IS NULL AND "workspaceId" = $2) OR ("userId" = $1 AND "workspaceId" IS NULL) OR ("userId" = $1 AND "workspaceId" = $2))
		 ORDER BY CASE WHEN "userId" IS NULL THEN 0 WHEN "workspaceId" IS NULL THEN 1 ELSE 2 END, "createdAt"`,
		userID, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query user vars: %w", err)
	}
	defer rows.Close()
	merged := map[string]any{}
	for rows.Next() {
		var key string
		var value any
		if err := rows.Scan(&key, &value); err != nil {
			return nil, fmt.Errorf("read user vars: %w", err)
		}
		merged[key] = value
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read user vars: %w", err)
	}
	return merged, nil
}

func onboardingStatus(activationStatus string, userVars map[string]any) string {
	switch {
	case activationStatus == "PENDING_CREATION" || activationStatus == "ONGOING_CREATION":
		return "WORKSPACE_ACTIVATION"
	case userVars["ONBOARDING_CONNECT_ACCOUNT_PENDING"] == true:
		return "SYNC_EMAIL"
	case userVars["ONBOARDING_CREATE_PROFILE_PENDING"] == true:
		return "PROFILE_CREATION"
	case userVars["ONBOARDING_INVITE_TEAM_PENDING"] == true:
		return "INVITE_TEAM"
	}
	return "COMPLETED"
}
