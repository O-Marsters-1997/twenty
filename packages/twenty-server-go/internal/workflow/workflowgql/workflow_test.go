package workflowgql_test

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

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/workflowgql"
)

const (
	seededWorkflowID = "bce3421f-e977-5fb5-ae82-eaef2cf48be6"
	seededVersionID  = "b6ee7abf-5306-5351-af2d-4cac51cbb62b"
	seededStepID     = "6e089bc9-aabd-435f-865f-f31c01c8f4a7"
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
	handler := workflowgql.NewHandler(&workflow.Authoring{Store: store.New(pool)}, logger)
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
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, h.server.URL+"/graphql", bytes.NewReader(body))
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

func (h harness) result(t *testing.T, operation, query string, variables map[string]any) any {
	t.Helper()
	decoded := h.send(t, operation, query, variables)
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)[lowerFirst(operation)]
}

func (h harness) data(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	return h.result(t, operation, query, variables).(map[string]any)
}

func lowerFirst(name string) string {
	return string(name[0]+'a'-'A') + name[1:]
}

func (h harness) goldenDiff(t *testing.T, name string, variables map[string]any, ignore ...string) string {
	t.Helper()
	c, err := golden.Load("testdata", name)
	if err != nil {
		t.Fatal(err)
	}
	if variables != nil {
		c.Variables = variables
	}
	got, err := golden.Send(h.server.Client(), h.server.URL, "token", c)
	if err != nil {
		t.Fatal(err)
	}
	want, err := golden.Mask(c.Response, ignore)
	if err != nil {
		t.Fatal(err)
	}
	gotDoc, err := golden.Mask(got, ignore)
	if err != nil {
		t.Fatal(err)
	}
	return cmp.Diff(want, gotDoc)
}

func (h harness) draftOfSeededWorkflow(t *testing.T) string {
	t.Helper()
	created := h.data(t, "CreateDraftFromCoreWorkflowVersion", `mutation CreateDraftFromCoreWorkflowVersion($input: CreateDraftFromCoreWorkflowVersionInput!) {
		createDraftFromCoreWorkflowVersion(input: $input) { id status } }`,
		map[string]any{"input": map[string]any{"coreWorkflowId": seededWorkflowID, "coreWorkflowVersionIdToCopy": seededVersionID}})
	return created["id"].(string)
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func TestWorkflowMutations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		variables func(t *testing.T, h harness) map[string]any
		ignore    []string
	}{
		{name: "CreateCoreWorkflow", ignore: []string{"data.createCoreWorkflow.id", "data.createCoreWorkflow.updatedAt"}},
		{name: "UpdateCoreWorkflow", ignore: []string{"data.updateCoreWorkflow.updatedAt"}},
		{name: "DeleteCoreWorkflows"},
		{name: "DeactivateCoreWorkflowVersion"},
		{name: "DiscardCoreWorkflowDraft", variables: func(t *testing.T, h harness) map[string]any {
			return map[string]any{"input": map[string]any{"coreWorkflowVersionId": h.draftOfSeededWorkflow(t)}}
		}, ignore: []string{"data.discardCoreWorkflowDraft.updatedAt"}},
		{name: "UpdateCoreWorkflowVersionPositions", variables: func(t *testing.T, h harness) map[string]any {
			return map[string]any{"input": map[string]any{"coreWorkflowVersionId": h.draftOfSeededWorkflow(t), "positions": []any{map[string]any{"id": "trigger", "position": map[string]any{"x": 10, "y": 20}}}}}
		}},
		{name: "DeleteCoreWorkflowVersionEdge", variables: func(t *testing.T, h harness) map[string]any {
			return map[string]any{"input": map[string]any{"coreWorkflowVersionId": h.draftOfSeededWorkflow(t), "source": "trigger", "target": seededStepID}}
		}},
		{name: "CreateCoreWorkflowVersionEdge", variables: func(t *testing.T, h harness) map[string]any {
			return map[string]any{"input": map[string]any{"coreWorkflowVersionId": h.draftOfSeededWorkflow(t), "source": "trigger", "target": seededStepID}}
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			var variables map[string]any
			if tt.variables != nil {
				variables = tt.variables(t, h)
			}
			if diff := h.goldenDiff(t, tt.name, variables, tt.ignore...); diff != "" {
				t.Errorf("%s differs from golden file (-golden +got):\n%s", tt.name, diff)
			}
		})
	}
}

func TestWorkflowAuthoring_buildsAndActivatesClassifyWorkflow(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	created := h.data(t, "CreateCoreWorkflow", `mutation CreateCoreWorkflow($input: CreateCoreWorkflowInput!) { createCoreWorkflow(input: $input) { id name statuses } }`,
		map[string]any{"input": map[string]any{"name": "Lead intake"}})
	workflowID := created["id"].(string)
	var draftID string
	if err := h.pool.QueryRow(t.Context(), `SELECT id::text FROM core."workflowVersion" WHERE "coreWorkflowId" = $1::uuid`, workflowID).Scan(&draftID); err != nil {
		t.Fatalf("select initial draft: %v", err)
	}

	const activate = `mutation ActivateCoreWorkflowVersion($coreWorkflowVersionId: UUID!) { activateCoreWorkflowVersion(coreWorkflowVersionId: $coreWorkflowVersionId) }`
	if code := errorCode(t, h.send(t, "ActivateCoreWorkflowVersion", activate, map[string]any{"coreWorkflowVersionId": draftID})); code != "BAD_USER_INPUT" {
		t.Errorf("activating an empty draft: error code = %q, want BAD_USER_INPUT", code)
	}

	trigger := map[string]any{
		"name": "Person created", "type": "DATABASE_EVENT", "nextStepIds": []any{},
		"settings": map[string]any{"eventName": "person.created", "outputSchema": map[string]any{}},
	}
	updatedTrigger := h.data(t, "UpdateCoreWorkflowVersionTrigger", `mutation UpdateCoreWorkflowVersionTrigger($input: UpdateCoreWorkflowVersionTriggerInput!) {
		updateCoreWorkflowVersionTrigger(input: $input) { trigger } }`,
		map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "trigger": trigger}})
	if diff := cmp.Diff(trigger, updatedTrigger["trigger"]); diff != "" {
		t.Errorf("updateCoreWorkflowVersionTrigger (-want +got):\n%s", diff)
	}

	changes := h.data(t, "CreateCoreWorkflowVersionStep", `mutation CreateCoreWorkflowVersionStep($input: CreateCoreWorkflowVersionStepInput!) {
		createCoreWorkflowVersionStep(input: $input) { triggerDiff stepsDiff } }`,
		map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "stepType": "CLASSIFY", "parentStepId": "trigger", "id": "classify-1"}})
	wantTriggerDiff := []any{map[string]any{"type": "CREATE", "path": []any{"trigger", "nextStepIds", 0.0}, "value": "classify-1"}}
	if diff := cmp.Diff(wantTriggerDiff, changes["triggerDiff"]); diff != "" {
		t.Errorf("createCoreWorkflowVersionStep triggerDiff (-want +got):\n%s", diff)
	}
	stepsDiff := changes["stepsDiff"].([]any)
	if len(stepsDiff) != 1 || stepsDiff[0].(map[string]any)["type"] != "CHANGE" || stepsDiff[0].(map[string]any)["oldValue"] != nil {
		t.Fatalf("createCoreWorkflowVersionStep stepsDiff = %v, want steps to change from null", stepsDiff)
	}
	if created := stepsDiff[0].(map[string]any)["value"].([]any); len(created) != 1 || created[0].(map[string]any)["name"] != "Classify" {
		t.Errorf("createCoreWorkflowVersionStep created steps = %v, want the Classify step", created)
	}

	const rename = `mutation UpdateCoreWorkflow($input: UpdateCoreWorkflowInput!) { updateCoreWorkflow(input: $input) { statuses } }`
	statuses := func() any {
		return h.data(t, "UpdateCoreWorkflow", rename, map[string]any{"input": map[string]any{"coreWorkflowId": workflowID, "name": "Lead intake"}})["statuses"]
	}
	if diff := cmp.Diff([]any{"DRAFT"}, statuses()); diff != "" {
		t.Errorf("statuses before activation (-want +got):\n%s", diff)
	}
	if got := h.result(t, "ActivateCoreWorkflowVersion", activate, map[string]any{"coreWorkflowVersionId": draftID}); got != true {
		t.Errorf("activateCoreWorkflowVersion = %v, want true", got)
	}
	if diff := cmp.Diff([]any{"ACTIVE"}, statuses()); diff != "" {
		t.Errorf("statuses after activation (-want +got):\n%s", diff)
	}

	const deactivate = `mutation DeactivateCoreWorkflowVersion($coreWorkflowVersionId: UUID!) { deactivateCoreWorkflowVersion(coreWorkflowVersionId: $coreWorkflowVersionId) }`
	if got := h.result(t, "DeactivateCoreWorkflowVersion", deactivate, map[string]any{"coreWorkflowVersionId": draftID}); got != true {
		t.Errorf("deactivateCoreWorkflowVersion = %v, want true", got)
	}
	if diff := cmp.Diff([]any{"DEACTIVATED"}, statuses()); diff != "" {
		t.Errorf("statuses after deactivation (-want +got):\n%s", diff)
	}
}

func TestWorkflowAuthoring_rejections(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	draftID := h.draftOfSeededWorkflow(t)

	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
		wantCode  string
	}{
		{"edit a published version", "UpdateCoreWorkflowVersionTrigger", `mutation UpdateCoreWorkflowVersionTrigger($input: UpdateCoreWorkflowVersionTriggerInput!) { updateCoreWorkflowVersionTrigger(input: $input) { trigger } }`,
			map[string]any{"input": map[string]any{"coreWorkflowVersionId": seededVersionID, "trigger": map[string]any{"type": "MANUAL"}}}, "FORBIDDEN"},
		{"unsupported step type", "CreateCoreWorkflowVersionStep", `mutation CreateCoreWorkflowVersionStep($input: CreateCoreWorkflowVersionStepInput!) { createCoreWorkflowVersionStep(input: $input) { triggerDiff } }`,
			map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "stepType": "WAIT_FOR_EVENT"}}, "BAD_USER_INPUT"},
		{"delete a missing step", "DeleteCoreWorkflowVersionStep", `mutation DeleteCoreWorkflowVersionStep($input: DeleteCoreWorkflowVersionStepInput!) { deleteCoreWorkflowVersionStep(input: $input) { triggerDiff } }`,
			map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "stepId": "missing"}}, "NOT_FOUND"},
		{"activate a published version", "ActivateCoreWorkflowVersion", `mutation ActivateCoreWorkflowVersion($coreWorkflowVersionId: UUID!) { activateCoreWorkflowVersion(coreWorkflowVersionId: $coreWorkflowVersionId) }`,
			map[string]any{"coreWorkflowVersionId": seededVersionID}, "BAD_USER_INPUT"},
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

func TestWorkflowAuthoring_stepEditing(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	draftID := h.draftOfSeededWorkflow(t)

	duplicated := h.data(t, "DuplicateCoreWorkflowVersionStep", `mutation DuplicateCoreWorkflowVersionStep($input: DuplicateCoreWorkflowVersionStepInput!) { duplicateCoreWorkflowVersionStep(input: $input) { triggerDiff stepsDiff } }`,
		map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "stepId": seededStepID}})
	stepsDiff := duplicated["stepsDiff"].([]any)
	if len(stepsDiff) != 1 || stepsDiff[0].(map[string]any)["value"].(map[string]any)["name"] != "Quick Lead Form (Duplicate)" {
		t.Errorf("duplicateCoreWorkflowVersionStep stepsDiff = %v, want one CREATE of the duplicated step", stepsDiff)
	}
	duplicateID := stepsDiff[0].(map[string]any)["value"].(map[string]any)["id"].(string)

	deleted := h.data(t, "DeleteCoreWorkflowVersionStep", `mutation DeleteCoreWorkflowVersionStep($input: DeleteCoreWorkflowVersionStepInput!) { deleteCoreWorkflowVersionStep(input: $input) { triggerDiff stepsDiff } }`,
		map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "stepId": duplicateID}})
	if diff := cmp.Diff([]any{}, deleted["triggerDiff"]); diff != "" {
		t.Errorf("deleteCoreWorkflowVersionStep triggerDiff (-want +got):\n%s", diff)
	}
	if got := deleted["stepsDiff"].([]any); len(got) != 1 || got[0].(map[string]any)["type"] != "REMOVE" {
		t.Errorf("deleteCoreWorkflowVersionStep stepsDiff = %v, want one REMOVE", got)
	}

	updated := h.data(t, "UpdateCoreWorkflowVersionStep", `mutation UpdateCoreWorkflowVersionStep($input: UpdateCoreWorkflowVersionStepInput!) { updateCoreWorkflowVersionStep(input: $input) { id name type valid nextStepIds } }`,
		map[string]any{"input": map[string]any{"coreWorkflowVersionId": draftID, "step": map[string]any{
			"id": seededStepID, "name": "Renamed form", "type": "FORM", "valid": true, "nextStepIds": []any{},
			"settings": map[string]any{"input": []any{}},
		}}})
	if updated["name"] != "Renamed form" || updated["type"] != "FORM" || updated["valid"] != true {
		t.Errorf("updateCoreWorkflowVersionStep = %v, want the renamed step", updated)
	}
}

func TestWorkflowAuthoring_duplicateAndDelete(t *testing.T) {
	t.Parallel()
	h := newHarness(t)

	duplicated := h.data(t, "DuplicateCoreWorkflow", `mutation DuplicateCoreWorkflow($input: DuplicateCoreWorkflowInput!) { duplicateCoreWorkflow(input: $input) { id name statuses } }`,
		map[string]any{"input": map[string]any{"coreWorkflowIdToDuplicate": seededWorkflowID, "coreWorkflowVersionIdToCopy": seededVersionID}})
	if duplicated["name"] != "Quick Lead (Duplicate)" || duplicated["id"] == seededWorkflowID {
		t.Errorf("duplicateCoreWorkflow = %v, want a new workflow named after the source", duplicated)
	}
	if diff := cmp.Diff([]any{"DRAFT"}, duplicated["statuses"]); diff != "" {
		t.Errorf("duplicated statuses (-want +got):\n%s", diff)
	}

	deleted := h.result(t, "DeleteCoreWorkflows", `mutation DeleteCoreWorkflows($input: DeleteCoreWorkflowsInput!) { deleteCoreWorkflows(input: $input) { id } }`,
		map[string]any{"input": map[string]any{"coreWorkflowIds": []any{duplicated["id"]}}})
	if diff := cmp.Diff([]any{map[string]any{"id": duplicated["id"]}}, deleted); diff != "" {
		t.Errorf("deleteCoreWorkflows (-want +got):\n%s", diff)
	}
}

func TestDefaultTable_routesWorkflowAuthoringToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointWorkspace]
	for _, operation := range frontdoor.WorkflowAuthoringOperations {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}
