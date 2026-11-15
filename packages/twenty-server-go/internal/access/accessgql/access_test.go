package accessgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/accessgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	webhookID = "5b3f6d54-8c67-4f0e-9a52-0f4a2f3d9c11"
	missingID = "00000000-0000-4000-8000-000000000000"
)

type fakeTokens struct{}

func (fakeTokens) IssueAPIKey(_ context.Context, workspaceID, apiKeyID string, _ time.Time) (string, error) {
	return "api-key:" + workspaceID + ":" + apiKeyID, nil
}

func (fakeTokens) IssuePlayground(_ context.Context, principal auth.Principal, _ time.Duration) (string, time.Time, error) {
	return "playground:" + principal.UserID, time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC), nil
}

type harness struct {
	handler http.Handler
	pool    *pgxpool.Pool
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	graphql := accessgql.NewHandler(&accessgql.Resolver{
		WebhookStore: store.NewWebhooks(pool), APIKeyStore: store.NewAPIKeys(pool), Tokens: fakeTokens{},
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserID: "user-1"})))
	})
	return harness{handler: handler, pool: pool}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler.ServeHTTP(recorder, req)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func (h harness) data(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	decoded := h.send(t, operation, query, variables)
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func (h harness) insertRole(t *testing.T, label string, assignableToAPIKeys bool) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canBeAssignedToApiKeys", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		label, workspace.PinnedWorkspaceID, assignableToAPIKeys).Scan(&id)
	if err != nil {
		t.Fatalf("insert role: %v", err)
	}
	return id
}

func (h harness) insertWebhook(t *testing.T) {
	t.Helper()
	_, err := h.pool.Exec(t.Context(), `INSERT INTO core.webhook (id, "targetUrl", operations, description, secret, "workspaceId", "universalIdentifier", "applicationId")
		VALUES ($1::uuid, 'https://example.com/hook', '{person.created,*.deleted}', 'Sync people', 'topsecret', $2::uuid, $1::uuid,
			(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid))`, webhookID, workspace.PinnedWorkspaceID)
	if err != nil {
		t.Fatalf("insert webhook: %v", err)
	}
}

func TestGetWebhook_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.insertWebhook(t)
	golden.Assert(t, h.handler, "testdata", "GetWebhook", "data.webhook.applicationId", "data.webhook.createdAt", "data.webhook.updatedAt")
}

func TestGetApiKey_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Integrator", true)
	created := h.data(t, "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"name": "CI", "expiresAt": "2030-01-01T00:00:00.000Z", "roleId": roleID}})["createApiKey"].(map[string]any)
	c, err := golden.Load("testdata", "GetApiKey")
	if err != nil {
		t.Fatal(err)
	}
	c.Variables = map[string]any{"input": map[string]any{"id": created["id"]}}
	got := h.send(t, c.Operation, c.Query, c.Variables)
	apiKey := got["data"].(map[string]any)["apiKey"].(map[string]any)
	apiKey["id"], apiKey["createdAt"], apiKey["role"].(map[string]any)["id"] = "<ignored>", "<ignored>", "<ignored>"
	var want map[string]any
	if err := json.Unmarshal(c.Response, &want); err != nil {
		t.Fatal(err)
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("GetApiKey (-want +got):\n%s", diff)
	}
}

func TestWebhookOperations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const fields = `id targetUrl operations description secret`

	created := h.data(t, "CreateWebhook", `mutation CreateWebhook($input: CreateWebhookInput!) { createWebhook(input: $input) { `+fields+` } }`,
		map[string]any{"input": map[string]any{
			"targetUrl": "https://example.com", "operations": []any{"person.created"}, "description": "  Sync   people ", "secret": "s3cret",
		}})["createWebhook"].(map[string]any)
	id := created["id"].(string)
	want := map[string]any{"id": id, "targetUrl": "https://example.com/", "operations": []any{"person.created"}, "description": "Sync people", "secret": "s3cret"}
	if diff := cmp.Diff(want, created); diff != "" {
		t.Errorf("createWebhook (-want +got):\n%s", diff)
	}

	generated := h.data(t, "CreateWebhook", `mutation CreateWebhook($input: CreateWebhookInput!) { createWebhook(input: $input) { secret } }`,
		map[string]any{"input": map[string]any{"targetUrl": "http://localhost:3000/in", "operations": []any{"*.*"}}})["createWebhook"].(map[string]any)
	if secret, _ := generated["secret"].(string); len(secret) != 64 {
		t.Errorf("generated secret = %q, want 64 hex characters", secret)
	}

	updated := h.data(t, "UpdateWebhook", `mutation UpdateWebhook($input: UpdateWebhookInput!) { updateWebhook(input: $input) { `+fields+` } }`,
		map[string]any{"input": map[string]any{"id": id, "update": map[string]any{"operations": []any{"*.*"}, "description": nil}}})["updateWebhook"].(map[string]any)
	if updated["description"] != nil || updated["targetUrl"] != "https://example.com/" || len(updated["operations"].([]any)) != 1 || updated["operations"].([]any)[0] != "*.*" {
		t.Errorf("updateWebhook = %v, want operations replaced, description cleared, target kept", updated)
	}

	listed := h.data(t, "GetWebhooks", `query GetWebhooks { webhooks { id } }`, nil)["webhooks"].([]any)
	if len(listed) != 2 {
		t.Errorf("webhooks = %v, want both created webhooks", listed)
	}

	deleted := h.data(t, "DeleteWebhook", `mutation DeleteWebhook($id: UUID!) { deleteWebhook(id: $id) { id } }`, map[string]any{"id": id})["deleteWebhook"].(map[string]any)
	if deleted["id"] != id {
		t.Errorf("deleteWebhook = %v, want the deleted webhook", deleted)
	}
	gone := h.data(t, "GetWebhook", `query GetWebhook($id: UUID!) { webhook(id: $id) { id } }`, map[string]any{"id": id})
	if gone["webhook"] != nil {
		t.Errorf("webhook after delete = %v, want null", gone["webhook"])
	}
}

func TestWebhookOperations_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
		wantCode  string
	}{
		{"create with a non-http target", "CreateWebhook", `mutation CreateWebhook($input: CreateWebhookInput!) { createWebhook(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"targetUrl": "ftp://example.com", "operations": []any{}}}, "BAD_USER_INPUT"},
		{"update unknown webhook", "UpdateWebhook", `mutation UpdateWebhook($input: UpdateWebhookInput!) { updateWebhook(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"id": missingID, "update": map[string]any{}}}, "NOT_FOUND"},
		{"delete unknown webhook", "DeleteWebhook", `mutation DeleteWebhook($id: UUID!) { deleteWebhook(id: $id) { id } }`,
			map[string]any{"id": missingID}, "NOT_FOUND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, tt.operation, tt.query, tt.variables)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}

func TestAPIKeyOperations(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Integrator", true)
	otherRoleID := h.insertRole(t, "Auditor", true)
	h.insertRole(t, "Admin only", false)
	const fields = `id name revokedAt role { id label }`

	created := h.data(t, "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { `+fields+` } }`,
		map[string]any{"input": map[string]any{"name": "CI", "expiresAt": "2030-01-01T00:00:00.000Z", "roleId": roleID}})["createApiKey"].(map[string]any)
	id := created["id"].(string)
	want := map[string]any{"id": id, "name": "CI", "revokedAt": nil, "role": map[string]any{"id": roleID, "label": "Integrator"}}
	if diff := cmp.Diff(want, created); diff != "" {
		t.Errorf("createApiKey (-want +got):\n%s", diff)
	}

	roles := h.data(t, "GetApiKeyRoles", `query GetApiKeyRoles { getApiKeyRoles { label canBeAssignedToApiKeys } }`, nil)["getApiKeyRoles"].([]any)
	for _, role := range roles {
		if role.(map[string]any)["canBeAssignedToApiKeys"] != true || role.(map[string]any)["label"] == "Admin only" {
			t.Errorf("getApiKeyRoles = %v, want only roles assignable to API keys", roles)
		}
	}

	assigned := h.data(t, "AssignRoleToApiKey", `mutation AssignRoleToApiKey($apiKeyId: UUID!, $roleId: UUID!) { assignRoleToApiKey(apiKeyId: $apiKeyId, roleId: $roleId) }`,
		map[string]any{"apiKeyId": id, "roleId": otherRoleID})
	if assigned["assignRoleToApiKey"] != true {
		t.Errorf("assignRoleToApiKey = %v, want true", assigned)
	}

	renamed := h.data(t, "UpdateApiKey", `mutation UpdateApiKey($input: UpdateApiKeyInput!) { updateApiKey(input: $input) { `+fields+` } }`,
		map[string]any{"input": map[string]any{"id": id, "name": "Deploys"}})["updateApiKey"].(map[string]any)
	if renamed["name"] != "Deploys" || renamed["role"].(map[string]any)["id"] != otherRoleID {
		t.Errorf("updateApiKey = %v, want the new name and the reassigned role", renamed)
	}

	token := h.data(t, "GenerateApiKeyToken", `mutation GenerateApiKeyToken($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
		map[string]any{"apiKeyId": id, "expiresAt": "2029-01-01T00:00:00.000Z"})["generateApiKeyToken"].(map[string]any)
	if token["token"] != "api-key:"+workspace.PinnedWorkspaceID+":"+id {
		t.Errorf("generateApiKeyToken = %v, want a token for the key", token)
	}

	playground := h.data(t, "GeneratePlaygroundToken", `mutation GeneratePlaygroundToken { generatePlaygroundToken { token expiresAt } }`, nil)["generatePlaygroundToken"].(map[string]any)
	if diff := cmp.Diff(map[string]any{"token": "playground:user-1", "expiresAt": "2026-01-02T03:04:05.000Z"}, playground); diff != "" {
		t.Errorf("generatePlaygroundToken (-want +got):\n%s", diff)
	}

	revoked := h.data(t, "RevokeApiKey", `mutation RevokeApiKey($input: RevokeApiKeyInput!) { revokeApiKey(input: $input) { id revokedAt } }`,
		map[string]any{"input": map[string]any{"id": id}})["revokeApiKey"].(map[string]any)
	if revoked["id"] != id || revoked["revokedAt"] == nil {
		t.Errorf("revokeApiKey = %v, want the key with revokedAt set", revoked)
	}
	active := h.data(t, "GetApiKeys", `query GetApiKeys { apiKeys { id } }`, nil)["apiKeys"].([]any)
	if len(active) != 0 {
		t.Errorf("apiKeys after revoke = %v, want none", active)
	}
	fetched := h.data(t, "GetApiKey", `query GetApiKey($input: GetApiKeyInput!) { apiKey(input: $input) { id revokedAt } }`, map[string]any{"input": map[string]any{"id": id}})
	if fetched["apiKey"].(map[string]any)["revokedAt"] == nil {
		t.Errorf("apiKey after revoke = %v, want it returned with revokedAt", fetched)
	}
	missing := h.data(t, "GetApiKey", `query GetApiKey($input: GetApiKeyInput!) { apiKey(input: $input) { id } }`, map[string]any{"input": map[string]any{"id": missingID}})
	if missing["apiKey"] != nil {
		t.Errorf("apiKey for an unknown id = %v, want null", missing["apiKey"])
	}
}

func TestAPIKeyOperations_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Integrator", true)
	lockedRoleID := h.insertRole(t, "Admin only", false)
	revoked := h.data(t, "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"name": "Old", "expiresAt": "2030-01-01T00:00:00.000Z", "revokedAt": "2025-01-01T00:00:00.000Z", "roleId": roleID}})["createApiKey"].(map[string]any)["id"].(string)
	live := h.data(t, "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"name": "Live", "expiresAt": "2030-01-01T00:00:00.000Z", "roleId": roleID}})["createApiKey"].(map[string]any)["id"].(string)

	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
		wantCode  string
	}{
		{"create with a role that cannot be assigned", "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"name": "X", "expiresAt": "2030-01-01T00:00:00.000Z", "roleId": lockedRoleID}}, "BAD_USER_INPUT"},
		{"create with an unknown role", "CreateApiKey", `mutation CreateApiKey($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"name": "X", "expiresAt": "2030-01-01T00:00:00.000Z", "roleId": missingID}}, "NOT_FOUND"},
		{"reactivate a revoked key", "UpdateApiKey", `mutation UpdateApiKey($input: UpdateApiKeyInput!) { updateApiKey(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"id": revoked, "revokedAt": nil}}, "FORBIDDEN"},
		{"token for a revoked key", "GenerateApiKeyToken", `mutation GenerateApiKeyToken($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
			map[string]any{"apiKeyId": revoked, "expiresAt": "2029-01-01T00:00:00.000Z"}, "FORBIDDEN"},
		{"token for an unknown key", "GenerateApiKeyToken", `mutation GenerateApiKeyToken($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
			map[string]any{"apiKeyId": missingID, "expiresAt": "2029-01-01T00:00:00.000Z"}, "NOT_FOUND"},
		{"assign to an unknown key", "AssignRoleToApiKey", `mutation AssignRoleToApiKey($apiKeyId: UUID!, $roleId: UUID!) { assignRoleToApiKey(apiKeyId: $apiKeyId, roleId: $roleId) }`,
			map[string]any{"apiKeyId": missingID, "roleId": roleID}, "NOT_FOUND"},
		{"assign a role that cannot be assigned", "AssignRoleToApiKey", `mutation AssignRoleToApiKey($apiKeyId: UUID!, $roleId: UUID!) { assignRoleToApiKey(apiKeyId: $apiKeyId, roleId: $roleId) }`,
			map[string]any{"apiKeyId": live, "roleId": lockedRoleID}, "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := errorCode(t, h.send(t, tt.operation, tt.query, tt.variables)); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}
