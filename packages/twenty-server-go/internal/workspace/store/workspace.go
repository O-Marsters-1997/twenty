package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var ErrForbidden = errors.New("forbidden")

const maxAllowedIframeOrigins = 20

const selectWorkspace = `SELECT jsonb_build_object('id', id, 'displayName', "displayName",
	'logo', CASE WHEN "logoFileId" IS NULL THEN '' ELSE COALESCE(logo, '') END, 'inviteHash', "inviteHash",
	'subdomain', subdomain, 'activationStatus', "activationStatus", 'defaultRoleId', "defaultRoleId",
	'allowImpersonation', "allowImpersonation", 'isPublicInviteLinkEnabled', "isPublicInviteLinkEnabled",
	'isCampaignClickTrackingEnabled', "isCampaignClickTrackingEnabled", 'isCampaignOpenTrackingEnabled', "isCampaignOpenTrackingEnabled",
	'workspaceDiscoverability', "workspaceDiscoverability", 'isGoogleAuthEnabled', "isGoogleAuthEnabled",
	'isPasswordAuthEnabled', "isPasswordAuthEnabled", 'isGoogleAuthBypassEnabled', "isGoogleAuthBypassEnabled",
	'isPasswordAuthBypassEnabled', "isPasswordAuthBypassEnabled", 'isTwoFactorAuthenticationEnforced', "isTwoFactorAuthenticationEnforced",
	'isInternalMessagesImportEnabled', "isInternalMessagesImportEnabled", 'trashRetentionDays', "trashRetentionDays",
	'eventLogRetentionDays', "eventLogRetentionDays", 'editableProfileFields', COALESCE("editableProfileFields", '{}'),
	'allowedIframeOrigins', "allowedIframeOrigins", 'aiChatModelTier', "aiChatModelTier", 'aiAgentModelTier', "aiAgentModelTier",
	'isAutoModelSelectionEnabled', "isAutoModelSelectionEnabled", 'aiModelIdByTier', "aiModelIdByTier",
	'aiEvaluationModelId', "aiEvaluationModelId", 'aiAdditionalInstructions', "aiAdditionalInstructions",
	'createdAt', to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	'updatedAt', to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
	FROM core.workspace WHERE id = $1::uuid`

type Workspace struct {
	ID                                string         `json:"id"`
	DisplayName                       *string        `json:"displayName"`
	Logo                              string         `json:"logo"`
	InviteHash                        *string        `json:"inviteHash"`
	Subdomain                         string         `json:"subdomain"`
	ActivationStatus                  string         `json:"activationStatus"`
	DefaultRoleID                     *string        `json:"defaultRoleId"`
	AllowImpersonation                bool           `json:"allowImpersonation"`
	IsPublicInviteLinkEnabled         bool           `json:"isPublicInviteLinkEnabled"`
	IsCampaignClickTrackingEnabled    bool           `json:"isCampaignClickTrackingEnabled"`
	IsCampaignOpenTrackingEnabled     bool           `json:"isCampaignOpenTrackingEnabled"`
	WorkspaceDiscoverability          string         `json:"workspaceDiscoverability"`
	IsGoogleAuthEnabled               bool           `json:"isGoogleAuthEnabled"`
	IsPasswordAuthEnabled             bool           `json:"isPasswordAuthEnabled"`
	IsGoogleAuthBypassEnabled         bool           `json:"isGoogleAuthBypassEnabled"`
	IsPasswordAuthBypassEnabled       bool           `json:"isPasswordAuthBypassEnabled"`
	IsTwoFactorAuthenticationEnforced bool           `json:"isTwoFactorAuthenticationEnforced"`
	IsInternalMessagesImportEnabled   bool           `json:"isInternalMessagesImportEnabled"`
	TrashRetentionDays                int            `json:"trashRetentionDays"`
	EventLogRetentionDays             int            `json:"eventLogRetentionDays"`
	EditableProfileFields             []string       `json:"editableProfileFields"`
	AllowedIframeOrigins              []string       `json:"allowedIframeOrigins"`
	AIChatModelTier                   string         `json:"aiChatModelTier"`
	AIAgentModelTier                  string         `json:"aiAgentModelTier"`
	IsAutoModelSelectionEnabled       bool           `json:"isAutoModelSelectionEnabled"`
	AIModelIDByTier                   map[string]any `json:"aiModelIdByTier"`
	AIEvaluationModelID               *string        `json:"aiEvaluationModelId"`
	AIAdditionalInstructions          *string        `json:"aiAdditionalInstructions"`
	CreatedAt                         string         `json:"createdAt"`
	UpdatedAt                         string         `json:"updatedAt"`
}

type fieldKind int

const (
	kindText fieldKind = iota
	kindBool
	kindInt
	kindTextList
	kindEnum
	kindUUID
)

type field struct {
	column   string
	kind     fieldKind
	flag     string
	nullable bool
	allowed  []string
	minimum  int
	maximum  int
}

const (
	flagWorkspace        = "WORKSPACE"
	flagSecurity         = "SECURITY"
	flagWorkspaceMembers = "WORKSPACE_MEMBERS"
	flagRoles            = "ROLES"
	flagAISettings       = "AI_SETTINGS"
)

var (
	discoverability = []string{"PUBLIC", "MEMBERS_AND_INVITEES", "HIDDEN"}
	modelTiers      = []string{"extraFast", "fast", "balanced", "smart", "extraSmart"}

	updatable = map[string]field{
		"subdomain":                         {column: "subdomain", kind: kindText, flag: flagWorkspace},
		"displayName":                       {column: "displayName", kind: kindText, flag: flagWorkspace, nullable: true},
		"logo":                              {column: "logo", kind: kindText, flag: flagWorkspace, nullable: true},
		"trashRetentionDays":                {column: "trashRetentionDays", kind: kindInt, flag: flagWorkspace, maximum: 1<<31 - 1},
		"eventLogRetentionDays":             {column: "eventLogRetentionDays", kind: kindInt, flag: flagSecurity, minimum: 1, maximum: 1095},
		"inviteHash":                        {column: "inviteHash", kind: kindText, flag: flagWorkspaceMembers, nullable: true},
		"isPublicInviteLinkEnabled":         {column: "isPublicInviteLinkEnabled", kind: kindBool, flag: flagSecurity},
		"workspaceDiscoverability":          {column: "workspaceDiscoverability", kind: kindEnum, flag: flagSecurity, allowed: discoverability},
		"allowImpersonation":                {column: "allowImpersonation", kind: kindBool, flag: flagSecurity},
		"isGoogleAuthEnabled":               {column: "isGoogleAuthEnabled", kind: kindBool, flag: flagSecurity},
		"isPasswordAuthEnabled":             {column: "isPasswordAuthEnabled", kind: kindBool, flag: flagSecurity},
		"editableProfileFields":             {column: "editableProfileFields", kind: kindTextList, flag: flagSecurity, nullable: true},
		"isTwoFactorAuthenticationEnforced": {column: "isTwoFactorAuthenticationEnforced", kind: kindBool, flag: flagSecurity},
		"defaultRoleId":                     {column: "defaultRoleId", kind: kindUUID, flag: flagRoles, nullable: true},
		"aiChatModelTier":                   {column: "aiChatModelTier", kind: kindEnum, flag: flagAISettings, allowed: modelTiers},
		"aiAgentModelTier":                  {column: "aiAgentModelTier", kind: kindEnum, flag: flagAISettings, allowed: modelTiers},
		"isAutoModelSelectionEnabled":       {column: "isAutoModelSelectionEnabled", kind: kindBool, flag: flagAISettings},
		"aiAdditionalInstructions":          {column: "aiAdditionalInstructions", kind: kindText, flag: flagWorkspace, nullable: true},
		"isInternalMessagesImportEnabled":   {column: "isInternalMessagesImportEnabled", kind: kindBool, flag: flagWorkspace},
		"isCampaignClickTrackingEnabled":    {column: "isCampaignClickTrackingEnabled", kind: kindBool, flag: flagWorkspace},
		"isCampaignOpenTrackingEnabled":     {column: "isCampaignOpenTrackingEnabled", kind: kindBool, flag: flagWorkspace},
	}

	updatableBeforeActivation = []string{"displayName", "subdomain", "logo"}
	unsupported               = []string{"aiModelIdByTier", "aiEvaluationModelId"}
	subdomainPattern          = regexp.MustCompile(`^(?:[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?)$`)
)

type Workspaces struct {
	pool                *pgxpool.Pool
	defaultSubdomain    string
	googleAuthAvailable bool
	passwordAvailable   bool
}

func NewWorkspaces(pool *pgxpool.Pool, defaultSubdomain string, googleAuthAvailable, passwordAuthAvailable bool) *Workspaces {
	return &Workspaces{pool: pool, defaultSubdomain: defaultSubdomain, googleAuthAvailable: googleAuthAvailable, passwordAvailable: passwordAuthAvailable}
}

func (w *Workspaces) Get(ctx context.Context) (Workspace, error) {
	return getWorkspace(ctx, w.pool)
}

func getWorkspace(ctx context.Context, conn interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}) (Workspace, error) {
	rows, err := conn.Query(ctx, selectWorkspace, workspace.PinnedWorkspaceID)
	if err != nil {
		return Workspace{}, fmt.Errorf("query workspace: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return Workspace{}, fmt.Errorf("read workspace: %w", err)
	}
	if len(documents) == 0 {
		return Workspace{}, fmt.Errorf("%w: workspace not found", metadata.ErrNotFound)
	}
	var found Workspace
	if err := json.Unmarshal(documents[0], &found); err != nil {
		return Workspace{}, fmt.Errorf("decode workspace: %w", err)
	}
	return found, nil
}

// Update applies the settings in updates once allow has approved every permission flag they need.
// A workspace still pending creation only accepts the fields in updatableBeforeActivation and needs no flag.
func (w *Workspaces) Update(ctx context.Context, updates map[string]any, allow func(ctx context.Context, flag string) (bool, error)) (Workspace, error) {
	current, err := w.Get(ctx)
	if err != nil {
		return Workspace{}, err
	}
	updates = plain(updates)
	names := make([]string, 0, len(updates))
	for name := range updates {
		names = append(names, name)
	}
	sort.Strings(names)
	if len(names) == 0 {
		return current, nil
	}

	if current.ActivationStatus == "PENDING_CREATION" {
		for _, name := range names {
			if !slices.Contains(updatableBeforeActivation, name) {
				return Workspace{}, fmt.Errorf("%w: %s cannot be updated before the workspace is activated", ErrForbidden, name)
			}
		}
	} else if err := w.authorize(ctx, names, allow); err != nil {
		return Workspace{}, err
	}

	if err := w.validateSystemSwitches(updates); err != nil {
		return Workspace{}, err
	}
	if subdomain, ok := updates["subdomain"].(string); ok && subdomain != current.Subdomain {
		if err := w.validateSubdomain(ctx, subdomain); err != nil {
			return Workspace{}, err
		}
	}

	assignments := make([]string, 0, len(names)+1)
	args := []any{workspace.PinnedWorkspaceID}
	for _, name := range names {
		spec := updatable[name]
		value, err := spec.value(name, updates[name])
		if err != nil {
			return Workspace{}, err
		}
		args = append(args, value)
		assignments = append(assignments, fmt.Sprintf(`"%s" = $%d%s`, spec.column, len(args), spec.cast()))
	}
	if value, present := updates["logo"]; present && value == nil {
		assignments = append(assignments, `"logoFileId" = NULL`)
	}
	_, err = w.pool.Exec(ctx, `UPDATE core.workspace SET `+strings.Join(assignments, ", ")+`, "updatedAt" = now() WHERE id = $1::uuid`, args...)
	if err != nil {
		return Workspace{}, fmt.Errorf("update workspace: %w", err)
	}
	return w.Get(ctx)
}

func plain(input map[string]any) map[string]any {
	unwrapped := make(map[string]any, len(input))
	for name, value := range input {
		switch typed := value.(type) {
		case *string:
			unwrapped[name] = deref(typed)
		case *bool:
			unwrapped[name] = deref(typed)
		case *int:
			unwrapped[name] = deref(typed)
		case []string:
			items := make([]any, len(typed))
			for i, item := range typed {
				items[i] = item
			}
			unwrapped[name] = items
		default:
			unwrapped[name] = value
		}
	}
	return unwrapped
}

func deref[TValue any](pointer *TValue) any {
	if pointer == nil {
		return nil
	}
	return *pointer
}

func (w *Workspaces) authorize(ctx context.Context, names []string, allow func(context.Context, string) (bool, error)) error {
	missing := map[string][]string{}
	flags := []string{}
	for _, name := range names {
		spec, known := updatable[name]
		if !known {
			if slices.Contains(unsupported, name) {
				return fmt.Errorf("%w: %s is validated against the AI model registry, which this server does not serve yet", metadata.ErrInvalidInput, name)
			}
			return fmt.Errorf("%w: the field %q cannot be updated", ErrForbidden, name)
		}
		if _, seen := missing[spec.flag]; !seen {
			flags = append(flags, spec.flag)
		}
		missing[spec.flag] = append(missing[spec.flag], name)
	}
	for _, flag := range flags {
		allowed, err := allow(ctx, flag)
		if err != nil {
			return err
		}
		if !allowed {
			return fmt.Errorf("%w: you do not have permission to update these fields: %s", ErrForbidden, strings.Join(missing[flag], ", "))
		}
	}
	return nil
}

func (w *Workspaces) validateSystemSwitches(updates map[string]any) error {
	if enabled, _ := updates["isGoogleAuthEnabled"].(bool); enabled && !w.googleAuthAvailable {
		return fmt.Errorf("%w: Google auth is not enabled in the system", metadata.ErrInvalidInput)
	}
	if enabled, _ := updates["isPasswordAuthEnabled"].(bool); enabled && !w.passwordAvailable {
		return fmt.Errorf("%w: Password auth is not enabled in the system", metadata.ErrInvalidInput)
	}
	return nil
}

func (w *Workspaces) validateSubdomain(ctx context.Context, subdomain string) error {
	if !subdomainPattern.MatchString(subdomain) || strings.HasPrefix(subdomain, "api-") || slices.Contains(reservedSubdomains, subdomain) {
		return fmt.Errorf("%w: subdomain is not valid", metadata.ErrInvalidInput)
	}
	var taken bool
	if err := w.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core.workspace WHERE subdomain = $1)`, subdomain).Scan(&taken); err != nil {
		return fmt.Errorf("check subdomain: %w", err)
	}
	if taken || subdomain == w.defaultSubdomain {
		return fmt.Errorf("%w: subdomain already taken", metadata.ErrInvalidInput)
	}
	return nil
}

func (f field) cast() string {
	switch f.kind {
	case kindEnum:
		if f.column == "workspaceDiscoverability" {
			return "::core.workspace_discoverability_enum"
		}
	case kindTextList:
		return "::varchar[]"
	case kindUUID:
		return "::uuid"
	}
	return ""
}

func (f field) value(name string, raw any) (any, error) {
	invalid := func(want string) error {
		return fmt.Errorf("%w: %s must be %s", metadata.ErrInvalidInput, name, want)
	}
	if raw == nil {
		if !f.nullable {
			return nil, invalid("not null")
		}
		return nil, nil
	}
	switch f.kind {
	case kindText, kindUUID:
		text, ok := raw.(string)
		if !ok {
			return nil, invalid("a string")
		}
		return text, nil
	case kindBool:
		flag, ok := raw.(bool)
		if !ok {
			return nil, invalid("a boolean")
		}
		return flag, nil
	case kindInt:
		number, ok := wholeNumber(raw)
		if !ok || number < f.minimum || number > f.maximum {
			return nil, invalid(fmt.Sprintf("a whole number from %d to %d", f.minimum, f.maximum))
		}
		return number, nil
	case kindEnum:
		text, ok := raw.(string)
		if !ok || !slices.Contains(f.allowed, text) {
			return nil, invalid("one of " + strings.Join(f.allowed, ", "))
		}
		return text, nil
	case kindTextList:
		items, ok := raw.([]any)
		if !ok {
			return nil, invalid("a list of strings")
		}
		list := make([]string, len(items))
		for i, item := range items {
			if list[i], ok = item.(string); !ok {
				return nil, invalid("a list of strings")
			}
		}
		return list, nil
	}
	return nil, invalid("a supported value")
}

func wholeNumber(raw any) (int, bool) {
	switch number := raw.(type) {
	case int:
		return number, true
	case int64:
		return int(number), true
	case float64:
		return int(number), float64(int(number)) == number
	case json.Number:
		parsed, err := number.Int64()
		return int(parsed), err == nil
	}
	return 0, false
}

// UpdateAllowedIframeOrigins adds or removes one origin under a row lock so concurrent edits keep both changes.
func (w *Workspaces) UpdateAllowedIframeOrigins(ctx context.Context, operation, origin string) (Workspace, error) {
	if operation != "add" && operation != "remove" {
		return Workspace{}, fmt.Errorf("%w: operation must be add or remove", metadata.ErrInvalidInput)
	}
	normalized, ok := normalizeOrigin(origin)
	if !ok {
		return Workspace{}, fmt.Errorf("%w: enter an HTTP or HTTPS origin without a path or wildcard", metadata.ErrInvalidInput)
	}
	var updated Workspace
	err := pgx.BeginFunc(ctx, w.pool, func(tx pgx.Tx) error {
		var origins []string
		err := tx.QueryRow(ctx, `SELECT "allowedIframeOrigins" FROM core.workspace WHERE id = $1::uuid FOR UPDATE`, workspace.PinnedWorkspaceID).Scan(&origins)
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("%w: workspace not found", metadata.ErrNotFound)
		}
		if err != nil {
			return fmt.Errorf("lock workspace: %w", err)
		}
		if operation == "add" {
			if !slices.Contains(origins, normalized) {
				origins = append(origins, normalized)
			}
		} else {
			origins = slices.DeleteFunc(origins, func(existing string) bool { return existing == normalized })
		}
		if len(origins) > maxAllowedIframeOrigins {
			return fmt.Errorf("%w: you can allow up to %d origins", metadata.ErrInvalidInput, maxAllowedIframeOrigins)
		}
		if _, err := tx.Exec(ctx, `UPDATE core.workspace SET "allowedIframeOrigins" = $2::varchar[], "updatedAt" = now() WHERE id = $1::uuid`, workspace.PinnedWorkspaceID, origins); err != nil {
			return fmt.Errorf("update allowed iframe origins: %w", err)
		}
		updated, err = getWorkspace(ctx, tx)
		return err
	})
	return updated, err
}

func normalizeOrigin(value string) (string, bool) {
	if len(value) > 300 || strings.ContainsAny(value, " \t\r\n*\\") {
		return "", false
	}
	if !originPattern.MatchString(value) {
		return "", false
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.User != nil || (parsed.Path != "" && parsed.Path != "/") || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", false
	}
	if !hostnamePattern.MatchString(parsed.Hostname()) {
		return "", false
	}
	scheme, host := strings.ToLower(parsed.Scheme), strings.ToLower(parsed.Host)
	if port := parsed.Port(); (scheme == "http" && port == "80") || (scheme == "https" && port == "443") {
		host = strings.ToLower(parsed.Hostname())
	}
	return scheme + "://" + host, true
}

var originPattern = regexp.MustCompile(`(?i)^https?://[^/?#@]+/?$`)

var hostnamePattern = regexp.MustCompile(`(?i)^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$`)

var reservedSubdomains = []string{
	"about", "admin", "africa", "al", "america", "api", "app", "asia", "assets", "au", "audio", "auth", "az", "ba", "be", "bg", "billing", "blog",
	"ca", "careers", "cdn", "ch", "chat", "community", "companies", "config", "contact", "cy", "cz", "dash", "dashboard", "db", "de", "demo", "dev",
	"developer", "dk", "docs", "ee", "es", "eu", "europe", "events", "favicon", "feedback", "fi", "files", "forum", "fr", "gr", "help", "hr", "hu",
	"image", "images", "inbound", "is", "it", "jobs", "legal", "login", "logs", "london", "lt", "lv", "mail", "main", "me", "media", "merch",
	"metrics", "mk", "new-york", "news", "next", "nl", "no", "north-africa", "north-america", "nz", "oceania", "otel-collector", "paris", "partners",
	"partnership", "partnerships", "payment", "pl", "privacy", "production", "pt", "register", "ro", "rs", "ru", "san-francisco", "se", "settings",
	"shop", "si", "signin", "signup", "sk", "south-africa", "south-america", "staging", "storage", "store", "support", "t", "telemetry", "terms",
	"test", "testing", "tr", "trust", "ua", "uk", "us", "video", "www", "za",
}
