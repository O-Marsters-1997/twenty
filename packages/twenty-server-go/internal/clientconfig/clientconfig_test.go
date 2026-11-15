package clientconfig_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/clientconfig"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/config"
)

func fetch(t *testing.T, method string, cfg config.Config, model ai.ModelConfig, env map[string]string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	handler, err := clientconfig.NewHandler(cfg, model, func(name string) string { return env[name] })
	if err != nil {
		t.Fatal(err)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequestWithContext(t.Context(), method, "/client-config?v=v1", nil))
	var decoded map[string]any
	if recorder.Code == http.StatusOK {
		if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
			t.Fatalf("decode body: %v", err)
		}
	}
	return recorder, decoded
}

func TestClientConfig(t *testing.T) {
	cfg := config.Config{ServerURL: "https://crm.example.com", FrontendURL: "https://app.example.com:8443", DefaultSubdomain: "app", Production: true}
	model := ai.ModelConfig{Provider: ai.ProviderAnthropic, Model: "claude-sonnet-4-5"}
	recorder, got := fetch(t, http.MethodGet, cfg, model, map[string]string{"AUTH_GOOGLE_ENABLED": "true", "MUTATION_MAXIMUM_AFFECTED_RECORDS": "250"})

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d", recorder.Code)
	}
	for key, want := range map[string]any{
		"frontDomain":           "app.example.com",
		"serverUrl":             "https://crm.example.com",
		"canManageFeatureFlags": false,
		"authProviders":         map[string]any{"google": true, "magicLink": false, "password": true},
		"api":                   map[string]any{"mutationMaximumAffectedRecords": float64(250)},
		"support":               map[string]any{"supportDriver": "NONE"},
	} {
		if diff := cmp.Diff(want, got[key]); diff != "" {
			t.Errorf("%s mismatch (-want +got):\n%s", key, diff)
		}
	}
	models, _ := got["aiModels"].([]any)
	tiers, _ := got["aiModelTiers"].([]any)
	if len(models) != 1 || len(tiers) != 5 {
		t.Errorf("aiModels = %v, aiModelTiers = %v, want one model on all five tiers", models, tiers)
	}
}

func TestClientConfigWithoutModelOrWrongMethod(t *testing.T) {
	_, got := fetch(t, http.MethodGet, config.Config{}, ai.ModelConfig{}, nil)
	if models, ok := got["aiModels"].([]any); !ok || len(models) != 0 {
		t.Errorf("aiModels = %v, want an empty list", got["aiModels"])
	}
	if recorder, _ := fetch(t, http.MethodPost, config.Config{}, ai.ModelConfig{}, nil); recorder.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST status = %d, want 405", recorder.Code)
	}
}
