package clientconfig

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

var modelTiers = []string{"extraFast", "fast", "balanced", "smart", "extraSmart"}

type aiModel struct {
	ModelID       string `json:"modelId"`
	Label         string `json:"label"`
	SDKPackage    string `json:"sdkPackage"`
	ProviderName  string `json:"providerName"`
	ProviderLabel string `json:"providerLabel"`
}

type modelTier struct {
	Tier    string `json:"tier"`
	ModelID string `json:"modelId"`
}

type Handler struct {
	body []byte
}

// NewHandler builds the response once: every value comes from the process environment, so it cannot change while the server runs.
func NewHandler(cfg config.Config, model ai.ModelConfig, getenv func(string) string) (*Handler, error) {
	models := []aiModel{}
	tiers := []modelTier{}
	if model.Model != "" {
		sdkPackage, providerName, providerLabel := "@ai-sdk/openai", "openai", "OpenAI"
		switch model.Provider {
		case ai.ProviderAnthropic:
			sdkPackage, providerName, providerLabel = "@ai-sdk/anthropic", "anthropic", "Anthropic"
		case ai.ProviderOpenAICompatible:
			sdkPackage = "@ai-sdk/openai-compatible"
		}
		models = append(models, aiModel{ModelID: model.Model, Label: model.Model, SDKPackage: sdkPackage, ProviderName: providerName, ProviderLabel: providerLabel})
		for _, tier := range modelTiers {
			tiers = append(tiers, modelTier{Tier: tier, ModelID: model.Model})
		}
	}

	frontURL := cfg.FrontendURL
	if frontURL == "" {
		frontURL = cfg.ServerURL
	}
	frontDomain := ""
	if parsed, err := url.Parse(frontURL); err == nil {
		frontDomain = parsed.Hostname()
	}

	flag := func(name string, fallback bool) bool {
		if value, err := strconv.ParseBool(getenv(name)); err == nil {
			return value
		}
		return fallback
	}
	number := func(name string, fallback int) int {
		if value, err := strconv.Atoi(getenv(name)); err == nil {
			return value
		}
		return fallback
	}
	supportDriver := getenv("SUPPORT_DRIVER")
	if supportDriver == "" {
		supportDriver = "NONE"
	}
	captcha := map[string]any{}
	if provider := getenv("CAPTCHA_DRIVER"); provider != "" {
		captcha["provider"] = provider
	}
	if siteKey := getenv("CAPTCHA_SITE_KEY"); siteKey != "" {
		captcha["siteKey"] = siteKey
	}
	support := map[string]any{"supportDriver": supportDriver}
	if chatID := getenv("SUPPORT_FRONT_CHAT_ID"); chatID != "" {
		support["supportFrontChatId"] = chatID
	}

	response := map[string]any{
		"aiModels":           models,
		"aiEvaluationModels": []any{},
		"aiModelTiers":       tiers,
		"authProviders": map[string]any{
			"google":    flag("AUTH_GOOGLE_ENABLED", false),
			"magicLink": false,
			"password":  flag("AUTH_PASSWORD_ENABLED", true),
		},
		"signInPrefilled":              flag("SIGN_IN_PREFILLED", false),
		"isMultiWorkspaceEnabled":      cfg.MultiWorkspace,
		"isEmailVerificationRequired":  flag("IS_EMAIL_VERIFICATION_REQUIRED", false),
		"defaultSubdomain":             cfg.DefaultSubdomain,
		"frontDomain":                  frontDomain,
		"serverUrl":                    cfg.ServerURL,
		"support":                      support,
		"captcha":                      captcha,
		"api":                          map[string]any{"mutationMaximumAffectedRecords": number("MUTATION_MAXIMUM_AFFECTED_RECORDS", 100)},
		"onboarding":                   map[string]any{"inviteTeamMaxInvites": number("ONBOARDING_INVITE_TEAM_MAX_INVITES", 5)},
		"isAttachmentPreviewEnabled":   flag("IS_ATTACHMENT_PREVIEW_ENABLED", true),
		"canManageFeatureFlags":        !cfg.Production || flag("IS_FEATURE_FLAG_MANAGEMENT_ENABLED", false),
		"publicFeatureFlags":           []any{},
		"isCookieSessionEnabled":       true,
		"isGoogleMessagingEnabled":     flag("MESSAGING_PROVIDER_GMAIL_ENABLED", false),
		"isGoogleCalendarEnabled":      flag("CALENDAR_PROVIDER_GOOGLE_ENABLED", false),
		"isConfigVariablesInDbEnabled": false,
		"isEmailingDomainInDemoMode":   true,
		"allowRequestsToTwentyIcons":   flag("ALLOW_REQUESTS_TO_TWENTY_ICONS", true),
		"isCompanyEnrichmentEnabled":   false,
		"isClickHouseConfigured":       false,
		"isWorkspaceSchemaDDLLocked":   flag("WORKSPACE_SCHEMA_DDL_LOCKED", false),
		"isOnboardingAiChatEnabled":    flag("IS_ONBOARDING_AI_CHAT_ENABLED", false),
	}
	if version := getenv("APP_VERSION"); version != "" {
		response["appVersion"] = version
	}
	if page := getenv("CALENDAR_BOOKING_PAGE_ID"); page != "" {
		response["calendarBookingPageId"] = page
	}
	body, err := json.Marshal(response)
	if err != nil {
		return nil, err
	}
	return &Handler{body: body}, nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write(h.body)
}
