package agentgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/agentgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	helperAgentID = "6d8a2638-ae16-4268-8fda-9e3783f01d95"
	missingID     = "00000000-0000-4000-8000-000000000000"
	agentFields   = `id name label icon description prompt modelId responseFormat roleId isCustom modelConfiguration triggers`
)

type verifier struct{}

func (verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1"}, nil
}

type harness struct {
	handler http.Handler
	server  *httptest.Server
	pool    *pgxpool.Pool
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	handler := agentgql.NewHandler(store.NewAgents(pool), logger)
	server := httptest.NewServer(frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{}, handler, logger))
	t.Cleanup(server.Close)
	return harness{handler: handler, server: server, pool: pool}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, h.server.URL+"/metadata", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := h.server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
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

func (h harness) insertRole(t *testing.T, label string, assignableToAgents bool) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canBeAssignedToAgents", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		label, workspace.PinnedWorkspaceID, assignableToAgents).Scan(&id)
	if err != nil {
		t.Fatalf("insert role: %v", err)
	}
	return id
}

func TestFindOneAgent_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	golden.Assert(t, newHarness(t).handler, "testdata", "FindOneAgent",
		"data.findOneAgent.prompt", "data.findOneAgent.applicationId", "data.findOneAgent.createdAt", "data.findOneAgent.updatedAt")
}

func TestAgentOperationsRoundTrip(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	roleID := h.insertRole(t, "Support", true)
	otherRoleID := h.insertRole(t, "Auditor", true)

	created := h.data(t, "CreateOneAgent", `mutation CreateOneAgent($input: CreateAgentInput!) { createOneAgent(input: $input) { `+agentFields+` } }`,
		map[string]any{"input": map[string]any{
			"label": "  Lead   scorer ", "prompt": "Score leads", "modelId": "auto", "roleId": roleID,
			"responseFormat": map[string]any{"type": "json", "schema": map[string]any{"score": "number"}},
		}})["createOneAgent"].(map[string]any)
	agentID := created["id"].(string)
	wantCreated := map[string]any{
		"id": agentID, "name": "leadScorer", "label": "Lead scorer", "icon": nil, "description": nil,
		"prompt": "Score leads", "modelId": "auto", "roleId": roleID, "isCustom": true, "modelConfiguration": nil, "triggers": []any{},
		"responseFormat": map[string]any{"type": "json", "schema": map[string]any{"score": "number"}},
	}
	if diff := cmp.Diff(wantCreated, created); diff != "" {
		t.Errorf("createOneAgent (-want +got):\n%s", diff)
	}

	updated := h.data(t, "UpdateOneAgent", `mutation UpdateOneAgent($input: UpdateAgentInput!) { updateOneAgent(input: $input) { `+agentFields+` } }`,
		map[string]any{"input": map[string]any{"id": agentID, "description": "Scores", "roleId": nil, "triggers": []any{map[string]any{"type": "manual"}}}})["updateOneAgent"].(map[string]any)
	if updated["description"] != "Scores" || updated["roleId"] != nil || updated["label"] != "Lead scorer" || len(updated["triggers"].([]any)) != 1 {
		t.Errorf("updateOneAgent = %v, want description set, role removed, label kept", updated)
	}

	assigned := h.data(t, "AssignRoleToAgent", `mutation AssignRoleToAgent($agentId: UUID!, $roleId: UUID!) { assignRoleToAgent(agentId: $agentId, roleId: $roleId) }`,
		map[string]any{"agentId": agentID, "roleId": otherRoleID})
	if assigned["assignRoleToAgent"] != true {
		t.Errorf("assignRoleToAgent = %v, want true", assigned)
	}
	found := h.data(t, "FindOneAgent", `query FindOneAgent($id: UUID!) { findOneAgent(input: { id: $id }) { roleId } }`, map[string]any{"id": agentID})
	if found["findOneAgent"].(map[string]any)["roleId"] != otherRoleID {
		t.Errorf("findOneAgent = %v, want the assigned role %s", found, otherRoleID)
	}

	listed := h.data(t, "FindManyAgents", `query FindManyAgents { findManyAgents { id } }`, nil)["findManyAgents"].([]any)
	if len(listed) != 2 {
		t.Errorf("findManyAgents = %v, want the seeded helper and the new agent", listed)
	}

	deleted := h.data(t, "DeleteOneAgent", `mutation DeleteOneAgent($input: AgentIdInput!) { deleteOneAgent(input: $input) { id roleId } }`, map[string]any{"input": map[string]any{"id": agentID}})["deleteOneAgent"].(map[string]any)
	if deleted["id"] != agentID || deleted["roleId"] != otherRoleID {
		t.Errorf("deleteOneAgent = %v, want the deleted agent with its role", deleted)
	}
	var targets int
	if err := h.pool.QueryRow(t.Context(), `SELECT count(*) FROM core."roleTarget" WHERE "agentId" = $1::uuid`, agentID).Scan(&targets); err != nil || targets != 0 {
		t.Errorf("role targets of deleted agent = %d, %v, want 0", targets, err)
	}
}

func TestAssignRoleToAgent_errors(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	assignable := h.insertRole(t, "Support", true)
	locked := h.insertRole(t, "Locked", false)
	const mutation = `mutation AssignRoleToAgent($agentId: UUID!, $roleId: UUID!) { assignRoleToAgent(agentId: $agentId, roleId: $roleId) }`

	tests := []struct {
		name     string
		agentID  string
		roleID   string
		wantCode string
	}{
		{"unknown agent", missingID, assignable, "NOT_FOUND"},
		{"unknown role", helperAgentID, missingID, "NOT_FOUND"},
		{"role not assignable to agents", helperAgentID, locked, "FORBIDDEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := errorCode(t, h.send(t, "AssignRoleToAgent", mutation, map[string]any{"agentId": tt.agentID, "roleId": tt.roleID}))
			if got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
		})
	}
}

func TestAgentOperations_missingAgent(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	input := map[string]any{"input": map[string]any{"id": missingID}}
	if got := errorCode(t, h.send(t, "FindOneAgent", `query FindOneAgent($input: AgentIdInput!) { findOneAgent(input: $input) { id } }`, input)); got != "NOT_FOUND" {
		t.Errorf("findOneAgent error code = %q, want NOT_FOUND", got)
	}
	if got := errorCode(t, h.send(t, "DeleteOneAgent", `mutation DeleteOneAgent($input: AgentIdInput!) { deleteOneAgent(input: $input) { id } }`, input)); got != "NOT_FOUND" {
		t.Errorf("deleteOneAgent error code = %q, want NOT_FOUND", got)
	}
}
