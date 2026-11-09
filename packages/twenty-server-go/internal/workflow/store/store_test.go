package store_test

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const missingID = "00000000-0000-0000-0000-000000000000"

func seed(t *testing.T) (*store.Store, string, string) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	schema := `"` + workspace.SchemaName() + `".`
	var workflowID, versionID string
	err = pool.QueryRow(t.Context(), `INSERT INTO `+schema+`workflow (name, statuses) VALUES ('Welcome', '{DRAFT}') RETURNING id::text`).Scan(&workflowID)
	if err != nil {
		t.Fatalf("seed workflow: %v", err)
	}
	err = pool.QueryRow(t.Context(), `INSERT INTO `+schema+`"workflowVersion" ("workflowId", name, trigger, steps)
		VALUES ($1, 'v1', '{"type":"MANUAL"}', '[{"id":"s1","type":"CODE"}]') RETURNING id::text`, workflowID).Scan(&versionID)
	if err != nil {
		t.Fatalf("seed version: %v", err)
	}
	return store.New(pool), workflowID, versionID
}

func jsonEqual(t *testing.T, want string, got json.RawMessage) {
	t.Helper()
	var wantValue, gotValue any
	if err := json.Unmarshal([]byte(want), &wantValue); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(got, &gotValue); err != nil {
		t.Fatal(err)
	}
	if diff := cmp.Diff(wantValue, gotValue); diff != "" {
		t.Errorf("json (-want +got):\n%s", diff)
	}
}

func TestStore_Definitions(t *testing.T) {
	t.Parallel()
	s, workflowID, versionID := seed(t)

	workflow, err := s.Workflow(t.Context(), workflowID)
	if err != nil {
		t.Fatalf("Workflow() = %v", err)
	}
	want := store.Workflow{ID: workflowID, Name: "Welcome", Statuses: []string{"DRAFT"}}
	if diff := cmp.Diff(want, workflow); diff != "" {
		t.Errorf("Workflow() (-want +got):\n%s", diff)
	}

	version, err := s.Version(t.Context(), versionID)
	if err != nil {
		t.Fatalf("Version() = %v", err)
	}
	wantVersion := store.Version{ID: versionID, WorkflowID: workflowID, Name: "v1", Status: "DRAFT"}
	if diff := cmp.Diff(wantVersion, version, cmpopts.IgnoreFields(store.Version{}, "Trigger", "Steps")); diff != "" {
		t.Errorf("Version() (-want +got):\n%s", diff)
	}
	jsonEqual(t, `[{"id":"s1","type":"CODE"}]`, version.Steps)
	jsonEqual(t, `{"type":"MANUAL"}`, version.Trigger)

	versions, err := s.Versions(t.Context(), workflowID)
	if err != nil || len(versions) != 1 || versions[0].ID != versionID {
		t.Errorf("Versions() = %+v, %v", versions, err)
	}

	if _, err := s.Workflow(t.Context(), missingID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Workflow(missing) error = %v, want ErrNotFound", err)
	}
	if _, err := s.Version(t.Context(), missingID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Version(missing) error = %v, want ErrNotFound", err)
	}
}

func TestStore_RunLifecycle(t *testing.T) {
	t.Parallel()
	s, workflowID, versionID := seed(t)
	run, err := s.CreateRun(t.Context(), store.NewRun{WorkflowID: workflowID, VersionID: versionID, Name: "run", State: json.RawMessage(`{"stepInfos":{}}`)})
	if err != nil {
		t.Fatalf("CreateRun() = %v", err)
	}
	if run.Status != store.StatusNotStarted || run.WorkflowID != workflowID || run.VersionID != versionID {
		t.Fatalf("CreateRun() = %+v", run)
	}

	for _, status := range []string{store.StatusEnqueued, store.StatusRunning} {
		if run, err = s.Transition(t.Context(), run.ID, status, ""); err != nil {
			t.Fatalf("Transition(%s) = %v", status, err)
		}
	}
	if run.EnqueuedAt == nil || run.StartedAt == nil || run.EndedAt != nil {
		t.Errorf("timestamps after RUNNING = %+v", run)
	}

	step := json.RawMessage(`{"status":"SUCCESS","result":{"n":1}}`)
	if err := s.SetStepInfo(t.Context(), run.ID, "s1", step); err != nil {
		t.Fatalf("SetStepInfo() = %v", err)
	}
	if err := s.SetStepInfo(t.Context(), run.ID, "s1", json.RawMessage(`{"status":"FAILED"}`)); err != nil {
		t.Fatalf("SetStepInfo() overwrite = %v", err)
	}
	if err := s.SetStepInfo(t.Context(), run.ID, "s2", step); err != nil {
		t.Fatalf("SetStepInfo() second step = %v", err)
	}

	if _, err = s.Transition(t.Context(), run.ID, store.StatusFailed, "boom"); err != nil {
		t.Fatalf("Transition(FAILED) = %v", err)
	}
	got, err := s.Run(t.Context(), run.ID)
	if err != nil {
		t.Fatalf("Run() = %v", err)
	}
	if got.Status != store.StatusFailed || got.EndedAt == nil {
		t.Errorf("Run() = %+v", got)
	}
	jsonEqual(t, `{"stepInfos":{"s1":{"status":"FAILED"},"s2":{"status":"SUCCESS","result":{"n":1}}},"workflowRunError":"boom"}`, got.State)
}

func TestStore_RunErrors(t *testing.T) {
	t.Parallel()
	s, workflowID, versionID := seed(t)
	run, err := s.CreateRun(t.Context(), store.NewRun{WorkflowID: workflowID, VersionID: versionID, State: json.RawMessage(`{}`)})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Transition(t.Context(), run.ID, store.StatusCompleted, ""); !errors.Is(err, store.ErrInvalidTransition) {
		t.Errorf("Transition(NOT_STARTED to COMPLETED) error = %v, want ErrInvalidTransition", err)
	}
	if _, err := s.Transition(t.Context(), run.ID, store.StatusRunning, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Transition(t.Context(), run.ID, store.StatusCompleted, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Transition(t.Context(), run.ID, store.StatusRunning, ""); !errors.Is(err, store.ErrInvalidTransition) {
		t.Errorf("Transition(COMPLETED to RUNNING) error = %v, want ErrInvalidTransition", err)
	}

	if _, err := s.Run(t.Context(), missingID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Run(missing) error = %v, want ErrNotFound", err)
	}
	if _, err := s.Transition(t.Context(), missingID, store.StatusRunning, ""); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("Transition(missing) error = %v, want ErrNotFound", err)
	}
	if err := s.SetStepInfo(t.Context(), missingID, "s1", json.RawMessage(`{}`)); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("SetStepInfo(missing) error = %v, want ErrNotFound", err)
	}
}
