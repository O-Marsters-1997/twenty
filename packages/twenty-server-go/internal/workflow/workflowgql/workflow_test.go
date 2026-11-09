package workflowgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/workflowgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	failedRunID   = "11111111-1111-4111-8111-111111111111"
	runningRunID  = "22222222-2222-4222-8222-222222222222"
	formRunID     = "33333333-3333-4333-8333-333333333333"
	doneRunID     = "44444444-4444-4444-8444-444444444444"
	formStepID    = "55555555-5555-4555-8555-555555555555"
	missingID     = "00000000-0000-4000-8000-000000000000"
	readerSpaceID = "66666666-6666-4666-8666-666666666666"
	otherSpaceID  = "77777777-7777-4777-8777-777777777777"
)

type verifier struct{}

func (verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1", UserWorkspaceID: readerSpaceID}, nil
}

type queue struct {
	jobs []river.JobArgs
	err  error
}

func (q *queue) Enqueue(_ context.Context, args river.JobArgs) error {
	if q.err != nil {
		return q.err
	}
	q.jobs = append(q.jobs, args)
	return nil
}

type harness struct {
	handler http.Handler
	server  *httptest.Server
	pool    *pgxpool.Pool
	queue   *queue
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
	jobs := &queue{}
	handler := workflowgql.NewHandler(&workflowgql.Resolver{Store: store.New(pool), Queue: jobs, HTTPClient: &http.Client{}}, logger)
	server := httptest.NewServer(frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{}, handler, logger))
	t.Cleanup(server.Close)
	h := harness{handler: handler, server: server, pool: pool, queue: jobs}
	h.seed(t)
	return h
}

func (h harness) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatalf("exec %.60s: %v", sql, err)
	}
}

func (h harness) seed(t *testing.T) {
	t.Helper()
	schema := `"` + workspace.SchemaName() + `".`
	application := `(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $1::uuid)`
	h.exec(t, `INSERT INTO core."user" (id, email) VALUES ('88888888-8888-4888-8888-888888888888', 'reader@example.com'), ('99999999-9999-4999-8999-999999999999', 'other@example.com')`)
	h.exec(t, `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ($1, '88888888-8888-4888-8888-888888888888', $3), ($2, '99999999-9999-4999-8999-999999999999', $3)`,
		readerSpaceID, otherSpaceID, workspace.PinnedWorkspaceID)
	for _, w := range []struct {
		id, name, visibility, owner string
		system                      bool
	}{
		{"a0000000-0000-4000-8000-000000000001", "Alpha", "WORKSPACE", otherSpaceID, false},
		{"a0000000-0000-4000-8000-000000000002", "Beta_%", "WORKSPACE", "", false},
		{"a0000000-0000-4000-8000-000000000003", "Secret", "PRIVATE", otherSpaceID, false},
		{"a0000000-0000-4000-8000-000000000004", "Mine", "PRIVATE", readerSpaceID, false},
		{"a0000000-0000-4000-8000-000000000005", "Internal", "WORKSPACE", "", true},
	} {
		owner := any(w.owner)
		if w.owner == "" {
			owner = nil
		}
		h.exec(t, `INSERT INTO core.workflow (id, name, "universalIdentifier", "applicationId", "workspaceId", visibility, "createdByUserWorkspaceId", "isSystem", "workspaceWorkflowId")
			VALUES ($2::uuid, $3, gen_random_uuid(), `+application+`, $1, $4, $5::uuid, $6, gen_random_uuid())`,
			workspace.PinnedWorkspaceID, w.id, w.name, w.visibility, owner, w.system)
	}
	for _, v := range []struct{ id, workflow, status, at string }{
		{"b0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000001", "ACTIVE", "2026-01-01T00:00:00Z"},
		{"b0000000-0000-4000-8000-000000000002", "a0000000-0000-4000-8000-000000000001", "DRAFT", "2026-01-02T00:00:00Z"},
		{"b0000000-0000-4000-8000-000000000003", "a0000000-0000-4000-8000-000000000003", "ACTIVE", "2026-01-01T00:00:00Z"},
	} {
		h.exec(t, `INSERT INTO core."workflowVersion" (id, "coreWorkflowId", status, "workspaceId", "universalIdentifier", "applicationId", triggers, steps, "createdAt")
			VALUES ($2::uuid, $3::uuid, $4::text::core."workflowVersion_status_enum", $1, gen_random_uuid(), `+application+`, '[{"type":"MANUAL"}]', '[{"id":"s1"}]', $5::timestamptz)`,
			workspace.PinnedWorkspaceID, v.id, v.workflow, v.status, v.at)
	}

	form := `[{"id":"` + formStepID + `","type":"FORM","settings":{"input":[{"name":"email","type":"TEXT"},{"name":"owner","type":"RECORD"}]}}]`
	for _, run := range []struct{ id, status, state string }{
		{failedRunID, "FAILED", `{"stepInfos":{"s1":{"status":"SUCCESS","result":1},"s2":{"status":"FAILED","error":"boom"}},"workflowRunError":"boom"}`},
		{runningRunID, "RUNNING", `{"stepInfos":{},"flow":{"steps":[{"id":"s1","type":"CODE","name":"old"}]}}`},
		{formRunID, "RUNNING", `{"stepInfos":{"` + formStepID + `":{"status":"PENDING"}},"flow":{"steps":` + form + `}}`},
		{doneRunID, "COMPLETED", `{"stepInfos":{},"flow":{"steps":[{"id":"s1"}]}}`},
	} {
		h.exec(t, `INSERT INTO `+schema+`"workflowRun" (id, status, state) VALUES ($1::uuid, $2::text::`+schema+`"workflowRun_status_enum", $3::jsonb)`, run.id, run.status, run.state)
	}
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

func runStatus(t *testing.T, h harness, id string) string {
	t.Helper()
	var status string
	err := h.pool.QueryRow(t.Context(), `SELECT status::text FROM "`+workspace.SchemaName()+`"."workflowRun" WHERE id = $1`, id).Scan(&status)
	if err != nil {
		t.Fatal(err)
	}
	return status
}

func TestMutationJSON_matchesNodeShape(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"StopWorkflowRun", "RetryWorkflowRun", "SubmitFormStep"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, newHarness(t).handler, "testdata", name)
		})
	}
}

const listQuery = `query GetCoreWorkflows($first: Int, $after: String, $orderBy: CoreWorkflowOrderByField, $orderByDirection: CoreWorkflowOrderByDirection, $filter: CoreWorkflowFilterInput, $includeSystem: Boolean) {
	coreWorkflows(first: $first, after: $after, orderBy: $orderBy, orderByDirection: $orderByDirection, filter: $filter, includeSystem: $includeSystem) {
		edges { node { id name statuses visibility canChangeVisibility isSystem } cursor }
		pageInfo { endCursor hasNextPage }
		totalCount
	}
}`

func names(t *testing.T, connection map[string]any) []string {
	t.Helper()
	var result []string
	for _, edge := range connection["edges"].([]any) {
		result = append(result, edge.(map[string]any)["node"].(map[string]any)["name"].(string))
	}
	return result
}

func TestCoreWorkflows(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	list := func(variables map[string]any) map[string]any {
		return h.data(t, "GetCoreWorkflows", listQuery, variables)["coreWorkflows"].(map[string]any)
	}

	t.Run("hides private workflows of others and system workflows", func(t *testing.T) {
		t.Parallel()
		got := list(map[string]any{"orderBy": "NAME", "orderByDirection": "ASC"})
		want := []string{"Alpha", "Beta_%", "Mine", "Quick Lead"}
		if diff := cmp.Diff(want, names(t, got)); diff != "" {
			t.Errorf("names (-want +got):\n%s", diff)
		}
		if got["totalCount"] != float64(4) {
			t.Errorf("totalCount = %v, want 4", got["totalCount"])
		}
	})

	t.Run("includeSystem adds system workflows", func(t *testing.T) {
		t.Parallel()
		got := list(map[string]any{"orderBy": "NAME", "orderByDirection": "ASC", "includeSystem": true})
		if got["totalCount"] != float64(5) {
			t.Errorf("totalCount = %v, want 5", got["totalCount"])
		}
	})

	t.Run("pages by cursor", func(t *testing.T) {
		t.Parallel()
		first := list(map[string]any{"first": 3, "orderBy": "NAME", "orderByDirection": "ASC"})
		pageInfo := first["pageInfo"].(map[string]any)
		if pageInfo["hasNextPage"] != true {
			t.Fatalf("pageInfo = %v, want a next page", pageInfo)
		}
		second := list(map[string]any{"first": 3, "after": pageInfo["endCursor"], "orderBy": "NAME", "orderByDirection": "ASC"})
		if diff := cmp.Diff([]string{"Quick Lead"}, names(t, second)); diff != "" {
			t.Errorf("second page (-want +got):\n%s", diff)
		}
		if second["pageInfo"].(map[string]any)["hasNextPage"] != false {
			t.Errorf("second pageInfo = %v, want no next page", second["pageInfo"])
		}
	})

	t.Run("filters", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name string
			rule map[string]any
			want []string
		}{
			{"name contains escapes wildcards", map[string]any{"fieldKey": "NAME", "operand": "CONTAINS", "value": "_%"}, []string{"Beta_%"}},
			{"name does not contain", map[string]any{"fieldKey": "NAME", "operand": "DOES_NOT_CONTAIN", "value": "a"}, []string{"Mine"}},
			{"statuses contain draft", map[string]any{"fieldKey": "STATUSES", "operand": "CONTAINS", "value": `["DRAFT"]`}, []string{"Alpha"}},
			{"statuses empty", map[string]any{"fieldKey": "STATUSES", "operand": "IS_EMPTY"}, []string{"Beta_%", "Mine"}},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				got := list(map[string]any{"orderBy": "NAME", "orderByDirection": "ASC",
					"filter": map[string]any{"logicalOperator": "AND", "rules": []any{tt.rule}}})
				if diff := cmp.Diff(tt.want, names(t, got)); diff != "" {
					t.Errorf("names (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("rejects bad input", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name      string
			variables map[string]any
		}{
			{"page size", map[string]any{"first": 0}},
			{"cursor", map[string]any{"after": "not-a-cursor"}},
			{"unsupported operand", map[string]any{"filter": map[string]any{"logicalOperator": "AND", "rules": []any{map[string]any{"fieldKey": "NAME", "operand": "IS_BEFORE", "value": "x"}}}}},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()
				if got := errorCode(t, h.send(t, "GetCoreWorkflows", listQuery, tt.variables)); got != "BAD_USER_INPUT" {
					t.Errorf("error code = %q, want BAD_USER_INPUT", got)
				}
			})
		}
	})
}

func TestCoreWorkflowReads(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const alpha, secret, mine = "a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000003", "a0000000-0000-4000-8000-000000000004"

	byID := func(id string) any {
		return h.data(t, "GetCoreWorkflow", `query GetCoreWorkflow($id: UUID!) { coreWorkflow: coreWorkflowById(coreWorkflowId: $id) { id name statuses canChangeVisibility } }`,
			map[string]any{"id": id})["coreWorkflow"]
	}
	if got := byID(alpha).(map[string]any); got["name"] != "Alpha" || got["canChangeVisibility"] != false || cmp.Diff([]any{"DRAFT", "ACTIVE"}, got["statuses"]) != "" {
		t.Errorf("coreWorkflowById(alpha) = %v", got)
	}
	if got := byID(mine).(map[string]any); got["canChangeVisibility"] != true {
		t.Errorf("coreWorkflowById(mine) = %v, want canChangeVisibility", got)
	}
	if got := byID(secret); got != nil {
		t.Errorf("coreWorkflowById(secret) = %v, want null", got)
	}

	versions := h.data(t, "GetCoreWorkflowVersions", `query GetCoreWorkflowVersions($id: UUID!) { coreWorkflowVersions: coreWorkflowVersionsByCoreWorkflowId(coreWorkflowId: $id) { id label status } }`,
		map[string]any{"id": alpha})["coreWorkflowVersions"]
	want := []any{
		map[string]any{"id": "b0000000-0000-4000-8000-000000000002", "label": "v2", "status": "DRAFT"},
		map[string]any{"id": "b0000000-0000-4000-8000-000000000001", "label": "v1", "status": "ACTIVE"},
	}
	if diff := cmp.Diff(want, versions); diff != "" {
		t.Errorf("versions (-want +got):\n%s", diff)
	}

	denied := h.send(t, "GetCoreWorkflowVersions", `query GetCoreWorkflowVersions($id: UUID!) { coreWorkflowVersions: coreWorkflowVersionsByCoreWorkflowId(coreWorkflowId: $id) { id } }`, map[string]any{"id": secret})
	if got := errorCode(t, denied); got != "FORBIDDEN" {
		t.Errorf("private workflow versions error = %q, want FORBIDDEN", got)
	}

	version := h.data(t, "GetCoreWorkflowVersion", `query GetCoreWorkflowVersion($id: UUID!) { coreWorkflowVersion: coreWorkflowVersionById(coreWorkflowVersionId: $id) { label trigger steps } }`,
		map[string]any{"id": "b0000000-0000-4000-8000-000000000001"})["coreWorkflowVersion"]
	wantVersion := map[string]any{"label": "v1", "trigger": map[string]any{"type": "MANUAL"}, "steps": []any{map[string]any{"id": "s1"}}}
	if diff := cmp.Diff(wantVersion, version); diff != "" {
		t.Errorf("version (-want +got):\n%s", diff)
	}

	current := h.data(t, "GetCoreWorkflowsWithCurrentVersions", `query GetCoreWorkflowsWithCurrentVersions($input: CoreWorkflowsWithCurrentVersionsInput!) {
		coreWorkflowsWithCurrentVersions(input: $input) { workflow { id statuses } versions { label } currentVersion { id label trigger } }
	}`, map[string]any{"input": map[string]any{"coreWorkflowIds": []any{alpha, secret}}})["coreWorkflowsWithCurrentVersions"].([]any)
	if len(current) != 1 {
		t.Fatalf("coreWorkflowsWithCurrentVersions = %v, want only the visible workflow", current)
	}
	got := current[0].(map[string]any)
	if got["currentVersion"].(map[string]any)["label"] != "v2" || len(got["versions"].([]any)) != 2 {
		t.Errorf("coreWorkflowsWithCurrentVersions = %v, want the draft v2 as current of 2 versions", got)
	}
}

func TestStopWorkflowRun(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const stop = `mutation StopWorkflowRun($workflowRunId: UUID!) { stopWorkflowRun(workflowRunId: $workflowRunId) { id status } }`

	tests := []struct {
		name, runID, want string
	}{
		{"running run stops", runningRunID, "STOPPED"},
		{"completed run is untouched", doneRunID, "COMPLETED"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := h.data(t, "StopWorkflowRun", stop, map[string]any{"workflowRunId": tt.runID})["stopWorkflowRun"].(map[string]any)
			if got["status"] != tt.want || runStatus(t, h, tt.runID) != tt.want {
				t.Errorf("stopWorkflowRun(%s) = %v, want %s", tt.runID, got, tt.want)
			}
		})
	}
	if got := errorCode(t, h.send(t, "StopWorkflowRun", stop, map[string]any{"workflowRunId": missingID})); got != "NOT_FOUND" {
		t.Errorf("missing run error = %q, want NOT_FOUND", got)
	}
}

func TestRetryWorkflowRun(t *testing.T) {
	t.Parallel()
	const retry = `mutation RetryWorkflowRun($workflowRunId: UUID!) { retryWorkflowRun(workflowRunId: $workflowRunId) { id status } }`

	t.Run("failed run restarts with its failed steps cleared", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		got := h.data(t, "RetryWorkflowRun", retry, map[string]any{"workflowRunId": failedRunID})["retryWorkflowRun"].(map[string]any)
		if got["status"] != "RUNNING" {
			t.Errorf("retryWorkflowRun = %v, want RUNNING", got)
		}
		if diff := cmp.Diff([]river.JobArgs{workflow.RunWorkflowArgs{RunID: failedRunID}}, h.queue.jobs); diff != "" {
			t.Errorf("jobs (-want +got):\n%s", diff)
		}
		var state string
		if err := h.pool.QueryRow(t.Context(), `SELECT state::text FROM "`+workspace.SchemaName()+`"."workflowRun" WHERE id = $1`, failedRunID).Scan(&state); err != nil {
			t.Fatal(err)
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(state), &decoded); err != nil {
			t.Fatal(err)
		}
		wantInfos := map[string]any{"s1": map[string]any{"status": "SUCCESS", "result": float64(1)}}
		if diff := cmp.Diff(wantInfos, decoded["stepInfos"]); diff != "" || decoded["workflowRunError"] != nil {
			t.Errorf("state = %v (-want +got):\n%s", decoded, diff)
		}
	})

	t.Run("run that did not fail is untouched", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		got := h.data(t, "RetryWorkflowRun", retry, map[string]any{"workflowRunId": doneRunID})["retryWorkflowRun"].(map[string]any)
		if got["status"] != "COMPLETED" || len(h.queue.jobs) != 0 {
			t.Errorf("retryWorkflowRun = %v with %d jobs, want COMPLETED and none", got, len(h.queue.jobs))
		}
	})

	t.Run("failed enqueue puts the run back", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		h.queue.err = errors.New("queue down")
		if got := errorCode(t, h.send(t, "RetryWorkflowRun", retry, map[string]any{"workflowRunId": failedRunID})); got != "INTERNAL_SERVER_ERROR" {
			t.Errorf("error code = %q, want INTERNAL_SERVER_ERROR", got)
		}
		if got := runStatus(t, h, failedRunID); got != "FAILED" {
			t.Errorf("run status = %s, want FAILED", got)
		}
	})
}

func TestSubmitFormStep(t *testing.T) {
	t.Parallel()
	const submit = `mutation SubmitFormStep($input: SubmitFormStepInput!) { submitFormStep(input: $input) }`
	input := func(run, step string, response any) map[string]any {
		return map[string]any{"input": map[string]any{"workflowRunId": run, "stepId": step, "response": response}}
	}

	t.Run("queues the resume", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		response := map[string]any{"email": "a@b.c", "owner": map[string]any{"id": missingID}}
		if got := h.data(t, "SubmitFormStep", submit, input(formRunID, formStepID, response))["submitFormStep"]; got != true {
			t.Fatalf("submitFormStep = %v, want true", got)
		}
		if len(h.queue.jobs) != 1 {
			t.Fatalf("jobs = %v, want one resume", h.queue.jobs)
		}
		resume := h.queue.jobs[0].(workflow.ResumeStepArgs)
		var queued map[string]any
		if err := json.Unmarshal(resume.Input, &queued); err != nil || resume.RunID != formRunID || resume.StepID != formStepID || cmp.Diff(response, queued) != "" {
			t.Errorf("resume = %+v, want the response for the form step", resume)
		}
	})

	tests := []struct {
		name, run, step string
		response        any
		wantCode        string
	}{
		{"response is not an object", formRunID, formStepID, "text", "BAD_USER_INPUT"},
		{"unknown field", formRunID, formStepID, map[string]any{"nope": 1}, "BAD_USER_INPUT"},
		{"record pick without a record id", formRunID, formStepID, map[string]any{"owner": map[string]any{"id": "x"}}, "BAD_USER_INPUT"},
		{"step is not a form", runningRunID, "s1", map[string]any{}, "NOT_FOUND"},
		{"step not waiting", doneRunID, "s1", map[string]any{}, "NOT_FOUND"},
		{"unknown run", missingID, formStepID, map[string]any{}, "NOT_FOUND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			if got := errorCode(t, h.send(t, "SubmitFormStep", submit, input(tt.run, tt.step, tt.response))); got != tt.wantCode {
				t.Errorf("error code = %q, want %q", got, tt.wantCode)
			}
			if len(h.queue.jobs) != 0 {
				t.Errorf("jobs = %v, want none", h.queue.jobs)
			}
		})
	}
}

func TestUpdateWorkflowRunStep(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const update = `mutation UpdateWorkflowRunStep($input: UpdateWorkflowRunStepInput!) { updateWorkflowRunStep(input: $input) { id name type settings valid nextStepIds position { x y } } }`
	step := map[string]any{"id": "s1", "name": "new", "type": "CODE", "settings": map[string]any{"a": float64(1)}, "valid": true, "nextStepIds": []any{"s2"}, "position": map[string]any{"x": 1.5, "y": 2.0}}

	got := h.data(t, "UpdateWorkflowRunStep", update, map[string]any{"input": map[string]any{"workflowRunId": runningRunID, "step": step}})["updateWorkflowRunStep"]
	if diff := cmp.Diff(step, got); diff != "" {
		t.Errorf("updateWorkflowRunStep (-want +got):\n%s", diff)
	}
	var stored string
	if err := h.pool.QueryRow(t.Context(), `SELECT state#>>'{flow,steps,0,name}' FROM "`+workspace.SchemaName()+`"."workflowRun" WHERE id = $1`, runningRunID).Scan(&stored); err != nil || stored != "new" {
		t.Errorf("stored step name = %q, %v, want new", stored, err)
	}
	completed := h.send(t, "UpdateWorkflowRunStep", update, map[string]any{"input": map[string]any{"workflowRunId": doneRunID, "step": step}})
	if got := errorCode(t, completed); got != "BAD_USER_INPUT" {
		t.Errorf("completed run error = %q, want BAD_USER_INPUT", got)
	}
}

func TestTestHttpRequest(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/ok":
			body, _ := io.ReadAll(r.Body)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"method":"` + r.Method + `","body":` + string(body) + `}`))
		default:
			http.Error(w, "nope", http.StatusNotFound)
		}
	}))
	t.Cleanup(target.Close)
	const query = `mutation TestHttpRequest($input: TestHttpRequestInput!) { testHttpRequest(input: $input) { success message result error status statusText } }`
	call := func(path string) map[string]any {
		return h.data(t, "TestHttpRequest", query, map[string]any{"input": map[string]any{
			"url": target.URL + path, "method": "POST", "headers": map[string]any{}, "body": map[string]any{"a": 1},
		}})["testHttpRequest"].(map[string]any)
	}

	ok := call("/ok")
	if diff := cmp.Diff(map[string]any{"method": "POST", "body": map[string]any{"a": float64(1)}}, ok["result"]); diff != "" || ok["success"] != true || ok["status"] != float64(200) || ok["statusText"] != "OK" {
		t.Errorf("success = %v (-want +got):\n%s", ok, diff)
	}
	failed := call("/missing")
	if failed["success"] != false || failed["status"] != float64(404) || failed["error"] != "nope\n" {
		t.Errorf("failure = %v, want success false, status 404 and the response body as error", failed)
	}
}

func TestWorkflowStepConnectedAccountHandle(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.exec(t, `INSERT INTO core."connectedAccount" (id, "workspaceId", handle, provider, "userWorkspaceId", "handleAliases")
		VALUES ('c0000000-0000-4000-8000-000000000001', $1, 'me@example.com', 'google', $2, '{alias@example.com}')`, workspace.PinnedWorkspaceID, readerSpaceID)
	const query = `query WorkflowStepConnectedAccountHandle($id: UUID!) { workflowStepConnectedAccountHandle(connectedAccountId: $id) { id handle provider handleAliases } }`

	got := h.data(t, "WorkflowStepConnectedAccountHandle", query, map[string]any{"id": "c0000000-0000-4000-8000-000000000001"})["workflowStepConnectedAccountHandle"]
	want := map[string]any{"id": "c0000000-0000-4000-8000-000000000001", "handle": "me@example.com", "provider": "google", "handleAliases": []any{"alias@example.com"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("handle (-want +got):\n%s", diff)
	}
	if got := h.data(t, "WorkflowStepConnectedAccountHandle", query, map[string]any{"id": missingID})["workflowStepConnectedAccountHandle"]; got != nil {
		t.Errorf("missing account = %v, want null", got)
	}
}

func TestWorkflowOperationsAreRoutedToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()
	for _, operation := range frontdoor.WorkflowOperations {
		if got := table[frontdoor.EndpointWorkspace][operation]; got != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, got, frontdoor.RouteGo)
		}
	}
}
