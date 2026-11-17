package workspace

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Error carries the GraphQL error code and user-facing message Node returns for the condition.
type Error struct {
	Code     string
	Message  string
	Friendly string
}

func (e *Error) Error() string { return e.Message }

var (
	ErrNotFound          = &Error{"NOT_FOUND", "Workspace not found", "Workspace not found."}
	ErrSubdomainInvalid  = &Error{"CONFLICT", "Invalid subdomain", "Invalid subdomain."}
	ErrSubdomainTaken    = &Error{"CONFLICT", "Subdomain already taken", "This subdomain is already taken."}
	ErrIframeOriginLimit = &Error{"BAD_USER_INPUT", "Too many embedding origins", fmt.Sprintf("You can allow up to %d origins.", MaxAllowedIframeOrigins)}
	ErrInvalidIframe     = &Error{"BAD_USER_INPUT", "Enter an HTTP or HTTPS origin without a path or wildcard", "Enter an HTTP or HTTPS origin without a path or wildcard"}
	ErrInvalidOperation  = &Error{"BAD_USER_INPUT", "operation must be add or remove", "operation must be add or remove"}
	ErrAuthDisabled      = &Error{"FORBIDDEN", "Authentication provider is not enabled in the system.", "This feature is not enabled."}
	ErrBeforeActivation  = &Error{"FORBIDDEN", "Field cannot be updated before the workspace is activated", "These fields cannot be updated before the workspace is activated."}
	ErrInvalidField      = &Error{"BAD_USER_INPUT", "Invalid workspace field value", "Invalid workspace field value."}
	ErrActivating        = errors.New("workspace is already being created")
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

const activationStaleLock = "5 minutes"

type Role struct {
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

type Workspace struct {
	ID                                string
	Subdomain                         string
	DisplayName                       *string
	LogoFileID                        *string
	ActivationStatus                  string
	AllowImpersonation                bool
	IsPublicInviteLinkEnabled         bool
	IsCampaignClickTrackingEnabled    bool
	IsCampaignOpenTrackingEnabled     bool
	WorkspaceDiscoverability          string
	IsGoogleAuthEnabled               bool
	IsPasswordAuthEnabled             bool
	IsTwoFactorAuthenticationEnforced bool
	IsInternalMessagesImportEnabled   bool
	DefaultRoleID                     *string
	AllowedIframeOrigins              []string
}

// SubdomainCheck reports whether a subdomain is well formed and unclaimed.
type SubdomainCheck func(ctx context.Context, subdomain string) (valid, available bool, err error)

type SettingsConfig struct {
	GoogleAuthEnabled   bool
	PasswordAuthEnabled bool
}

type Settings struct {
	pool      *pgxpool.Pool
	config    SettingsConfig
	subdomain SubdomainCheck
}

func NewSettings(pool *pgxpool.Pool, config SettingsConfig, subdomain SubdomainCheck) *Settings {
	return &Settings{pool: pool, config: config, subdomain: subdomain}
}

const workspaceColumns = `id::text, subdomain, "displayName", "logoFileId"::text, "activationStatus"::text, "allowImpersonation",
	"isPublicInviteLinkEnabled", "isCampaignClickTrackingEnabled", "isCampaignOpenTrackingEnabled", "workspaceDiscoverability"::text,
	"isGoogleAuthEnabled", "isPasswordAuthEnabled", "isTwoFactorAuthenticationEnforced", "isInternalMessagesImportEnabled",
	"defaultRoleId"::text, "allowedIframeOrigins"`

type queryer interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func findWorkspace(ctx context.Context, db queryer, id, suffix string) (Workspace, error) {
	var w Workspace
	err := db.QueryRow(ctx, `SELECT `+workspaceColumns+` FROM core.workspace WHERE id = $1::uuid AND "deletedAt" IS NULL`+suffix, id).Scan(
		&w.ID, &w.Subdomain, &w.DisplayName, &w.LogoFileID, &w.ActivationStatus, &w.AllowImpersonation,
		&w.IsPublicInviteLinkEnabled, &w.IsCampaignClickTrackingEnabled, &w.IsCampaignOpenTrackingEnabled, &w.WorkspaceDiscoverability,
		&w.IsGoogleAuthEnabled, &w.IsPasswordAuthEnabled, &w.IsTwoFactorAuthenticationEnforced, &w.IsInternalMessagesImportEnabled,
		&w.DefaultRoleID, &w.AllowedIframeOrigins,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Workspace{}, ErrNotFound
	}
	if err != nil {
		return Workspace{}, fmt.Errorf("find workspace: %w", err)
	}
	return w, nil
}

func (s *Settings) Find(ctx context.Context, id string) (Workspace, error) {
	return findWorkspace(ctx, s.pool, id, "")
}

func (s *Settings) Role(ctx context.Context, id, workspaceID string) (*Role, error) {
	var r Role
	err := s.pool.QueryRow(ctx, `SELECT id::text, label, description, icon, "canUpdateAllSettings", "canAccessAllTools", "isEditable",
		"canReadAllObjectRecords", "canUpdateAllObjectRecords", "canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords",
		"canBeAssignedToUsers", "canBeAssignedToAgents", "canBeAssignedToApiKeys"
		FROM core.role WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspaceID).Scan(
		&r.ID, &r.Label, &r.Description, &r.Icon, &r.CanUpdateAllSettings, &r.CanAccessAllTools, &r.IsEditable,
		&r.CanReadAllObjectRecords, &r.CanUpdateAllObjectRecords, &r.CanSoftDeleteAllObjectRecords, &r.CanDestroyAllObjectRecords,
		&r.CanBeAssignedToUsers, &r.CanBeAssignedToAgents, &r.CanBeAssignedToAPIKeys,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find role: %w", err)
	}
	return &r, nil
}

func (s *Settings) UpdateAllowedIframeOrigins(ctx context.Context, id, operation, origin string) (Workspace, error) {
	if operation != "add" && operation != "remove" {
		return Workspace{}, ErrInvalidOperation
	}
	normalized, ok := NormalizeIframeOrigin(origin)
	if !ok {
		return Workspace{}, ErrInvalidIframe
	}
	var updated Workspace
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		current, err := findWorkspace(ctx, tx, id, " FOR UPDATE")
		if err != nil {
			return err
		}
		origins := current.AllowedIframeOrigins
		if operation == "add" && !slices.Contains(origins, normalized) {
			origins = append(slices.Clone(origins), normalized)
		}
		if operation == "remove" {
			origins = slices.DeleteFunc(slices.Clone(origins), func(existing string) bool { return existing == normalized })
		}
		if len(origins) > MaxAllowedIframeOrigins {
			return ErrIframeOriginLimit
		}
		if _, err := tx.Exec(ctx, `UPDATE core.workspace SET "allowedIframeOrigins" = $2, "updatedAt" = now() WHERE id = $1::uuid`, id, origins); err != nil {
			return fmt.Errorf("update allowed iframe origins: %w", err)
		}
		current.AllowedIframeOrigins = origins
		updated = current
		return nil
	})
	return updated, err
}

// Activate flips a pending workspace to ACTIVE. The Go server has no schema provisioning,
// so a workspace must already own its database schema and default role (core.workspace checks).
func (s *Settings) Activate(ctx context.Context, id string) (Workspace, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE core.workspace SET "activationStatus" = 'ACTIVE', "updatedAt" = now()
		WHERE id = $1::uuid AND "deletedAt" IS NULL AND ("activationStatus" = 'PENDING_CREATION'
			OR ("activationStatus" = 'ONGOING_CREATION' AND "updatedAt" < now() - $2::interval))`, id, activationStaleLock)
	if err != nil {
		return Workspace{}, fmt.Errorf("activate workspace: %w", err)
	}
	current, err := s.Find(ctx, id)
	if err != nil {
		return Workspace{}, err
	}
	if tag.RowsAffected() == 0 && current.ActivationStatus != "ACTIVE" && current.ActivationStatus != "CREATED" {
		return Workspace{}, ErrActivating
	}
	return current, nil
}

type column struct {
	name     string
	cast     string
	nullable bool
	check    func(any) (any, bool)
}

func asString(value any) (any, bool) {
	text, ok := value.(string)
	return text, ok
}

func asBool(value any) (any, bool) {
	flag, ok := value.(bool)
	return flag, ok
}

func asUUID(value any) (any, bool) {
	text, ok := value.(string)
	return text, ok && uuidPattern.MatchString(text)
}

func oneOf(allowed ...string) func(any) (any, bool) {
	return func(value any) (any, bool) {
		text, ok := value.(string)
		return text, ok && slices.Contains(allowed, text)
	}
}

func intBetween(minimum, maximum int) func(any) (any, bool) {
	return func(value any) (any, bool) {
		var number float64
		switch typed := value.(type) {
		case int:
			number = float64(typed)
		case int64:
			number = float64(typed)
		case float64:
			number = typed
		case json.Number:
			parsed, err := typed.Float64()
			if err != nil {
				return nil, false
			}
			number = parsed
		default:
			return nil, false
		}
		return int(number), number == float64(int(number)) && number >= float64(minimum) && number <= float64(maximum)
	}
}

func asStringList(value any) (any, bool) {
	list, ok := value.([]string)
	return list, ok
}

func unwrap(value any) any {
	switch typed := value.(type) {
	case *string:
		if typed != nil {
			return *typed
		}
		return nil
	case *bool:
		if typed != nil {
			return *typed
		}
		return nil
	case *float64:
		if typed != nil {
			return *typed
		}
		return nil
	case map[string]any:
		if typed == nil {
			return nil
		}
	case []string:
		if typed == nil {
			return nil
		}
	}
	return value
}

func asObject(value any) (any, bool) {
	object, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	encoded, err := json.Marshal(object)
	return string(encoded), err == nil
}

var aiModelTiers = []string{"extraFast", "fast", "balanced", "smart", "extraSmart"}

var updatableColumns = map[string]column{
	"subdomain":                         {name: "subdomain", check: asString},
	"displayName":                       {name: "displayName", nullable: true, check: asString},
	"logo":                              {name: "logo", nullable: true, check: asString},
	"inviteHash":                        {name: "inviteHash", nullable: true, check: asString},
	"isPublicInviteLinkEnabled":         {name: "isPublicInviteLinkEnabled", check: asBool},
	"isCampaignClickTrackingEnabled":    {name: "isCampaignClickTrackingEnabled", check: asBool},
	"isCampaignOpenTrackingEnabled":     {name: "isCampaignOpenTrackingEnabled", check: asBool},
	"workspaceDiscoverability":          {name: "workspaceDiscoverability", check: oneOf("PUBLIC", "MEMBERS_AND_INVITEES", "HIDDEN")},
	"allowImpersonation":                {name: "allowImpersonation", check: asBool},
	"isGoogleAuthEnabled":               {name: "isGoogleAuthEnabled", check: asBool},
	"isPasswordAuthEnabled":             {name: "isPasswordAuthEnabled", check: asBool},
	"isGoogleAuthBypassEnabled":         {name: "isGoogleAuthBypassEnabled", check: asBool},
	"isPasswordAuthBypassEnabled":       {name: "isPasswordAuthBypassEnabled", check: asBool},
	"defaultRoleId":                     {name: "defaultRoleId", nullable: true, check: asUUID},
	"isTwoFactorAuthenticationEnforced": {name: "isTwoFactorAuthenticationEnforced", check: asBool},
	"trashRetentionDays":                {name: "trashRetentionDays", check: intBetween(0, 1<<31-1)},
	"eventLogRetentionDays":             {name: "eventLogRetentionDays", check: intBetween(1, 1095)},
	"aiChatModelTier":                   {name: "aiChatModelTier", check: oneOf(aiModelTiers...)},
	"aiAgentModelTier":                  {name: "aiAgentModelTier", check: oneOf(aiModelTiers...)},
	"isAutoModelSelectionEnabled":       {name: "isAutoModelSelectionEnabled", check: asBool},
	"aiModelIdByTier":                   {name: "aiModelIdByTier", cast: "::jsonb", check: asObject},
	"aiEvaluationModelId":               {name: "aiEvaluationModelId", nullable: true, check: asString},
	"aiAdditionalInstructions":          {name: "aiAdditionalInstructions", nullable: true, check: asString},
	"editableProfileFields":             {name: "editableProfileFields", nullable: true, check: asStringList},
	"isInternalMessagesImportEnabled":   {name: "isInternalMessagesImportEnabled", check: asBool},
}

var fieldsUpdatableBeforeActivation = []string{"displayName", "subdomain", "logo"}

// Update applies the fields present in the map; an explicit null clears a nullable column and is ignored elsewhere.
func (s *Settings) Update(ctx context.Context, id string, input map[string]any) (Workspace, error) {
	fields := make(map[string]any, len(input))
	for name, value := range input {
		fields[name] = unwrap(value)
	}
	current, err := s.Find(ctx, id)
	if err != nil {
		return Workspace{}, err
	}
	names := slices.Sorted(maps.Keys(fields))
	if current.ActivationStatus == "PENDING_CREATION" {
		for _, name := range names {
			if !slices.Contains(fieldsUpdatableBeforeActivation, name) {
				return Workspace{}, ErrBeforeActivation
			}
		}
	}
	if subdomain, ok := fields["subdomain"].(string); ok && subdomain != current.Subdomain {
		if err := s.validateSubdomain(ctx, subdomain); err != nil {
			return Workspace{}, err
		}
	}
	for _, name := range []string{"isGoogleAuthEnabled", "isGoogleAuthBypassEnabled"} {
		if fields[name] == true && !s.config.GoogleAuthEnabled {
			return Workspace{}, ErrAuthDisabled
		}
	}
	for _, name := range []string{"isPasswordAuthEnabled", "isPasswordAuthBypassEnabled"} {
		if fields[name] == true && !s.config.PasswordAuthEnabled {
			return Workspace{}, ErrAuthDisabled
		}
	}

	var assignments []string
	args := []any{id}
	set := func(columnName, cast string, value any) {
		args = append(args, value)
		assignments = append(assignments, fmt.Sprintf(`"%s" = $%d%s`, columnName, len(args), cast))
	}
	for _, name := range names {
		spec, known := updatableColumns[name]
		if !known {
			return Workspace{}, fmt.Errorf("%w: unknown field %s", ErrInvalidField, name)
		}
		value := fields[name]
		if value == nil {
			if spec.nullable {
				set(spec.name, spec.cast, nil)
				if name == "logo" {
					set("logoFileId", "", nil)
				}
			}
			continue
		}
		checked, valid := spec.check(value)
		if !valid {
			return Workspace{}, fmt.Errorf("%w: %s", ErrInvalidField, name)
		}
		set(spec.name, spec.cast, checked)
	}
	if len(assignments) > 0 {
		query := `UPDATE core.workspace SET ` + strings.Join(assignments, ", ") + `, "updatedAt" = now() WHERE id = $1::uuid`
		if _, err := s.pool.Exec(ctx, query, args...); err != nil {
			return Workspace{}, fmt.Errorf("update workspace: %w", err)
		}
	}
	return s.Find(ctx, id)
}

func (s *Settings) validateSubdomain(ctx context.Context, subdomain string) error {
	valid, available, err := s.subdomain(ctx, subdomain)
	if err != nil {
		return fmt.Errorf("check subdomain: %w", err)
	}
	switch {
	case !valid:
		return ErrSubdomainInvalid
	case !available:
		return ErrSubdomainTaken
	}
	return nil
}
