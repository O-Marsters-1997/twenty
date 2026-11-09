package main

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

type fakeStore struct {
	run   store.Run
	steps json.RawMessage
}

func (f *fakeStore) Run(context.Context, string) (store.Run, error) { return f.run, nil }

func (f *fakeStore) Version(context.Context, string) (store.Version, error) {
	return store.Version{Steps: f.steps}, nil
}

func (f *fakeStore) Transition(_ context.Context, _, status, _ string) (store.Run, error) {
	f.run.Status = status
	return f.run, nil
}

func (f *fakeStore) SetStepInfo(_ context.Context, _, stepID string, info json.RawMessage) error {
	var state map[string]map[string]json.RawMessage
	if err := json.Unmarshal(f.run.State, &state); err != nil {
		return err
	}
	state["stepInfos"][stepID] = info
	var err error
	f.run.State, err = json.Marshal(state)
	return err
}

type stubAction struct {
	actionType workflow.ActionType
	run        func(workflow.StepInput) (workflow.StepOutput, error)
}

func (a stubAction) Type() workflow.ActionType { return a.actionType }

func (a stubAction) Run(_ context.Context, input workflow.StepInput) (workflow.StepOutput, error) {
	return a.run(input)
}

func newFakeStore(steps string) *fakeStore {
	return &fakeStore{
		run: store.Run{
			ID:     "run",
			Status: store.StatusEnqueued,
			State:  json.RawMessage(`{"stepInfos":{"trigger":{"status":"SUCCESS","result":{"name":"Ada"}}}}`),
		},
		steps: json.RawMessage(steps),
	}
}

func TestRunWorkflowWorker_Work(t *testing.T) {
	t.Parallel()
	args := &river.Job[workflow.RunWorkflowArgs]{Args: workflow.RunWorkflowArgs{RunID: "run"}}

	t.Run("runs steps in order with trigger and earlier outputs in context", func(t *testing.T) {
		t.Parallel()
		var seen []map[string]any
		record := func(result any) func(workflow.StepInput) (workflow.StepOutput, error) {
			return func(input workflow.StepInput) (workflow.StepOutput, error) {
				seen = append(seen, maps.Clone(input.Context))
				return workflow.StepOutput{Result: result}, nil
			}
		}
		registry, err := workflow.NewRegistry(
			stubAction{actionType: workflow.ActionTypeEmpty, run: record("one")},
			stubAction{actionType: workflow.ActionTypeFilter, run: record("two")},
		)
		if err != nil {
			t.Fatal(err)
		}
		fake := newFakeStore(`[{"id":"a","type":"EMPTY"},{"id":"b","type":"FILTER"}]`)
		worker := &runWorkflowWorker{exec: &executor{store: fake, registry: registry}}

		if err := worker.Work(t.Context(), args); err != nil {
			t.Fatalf("Work() = %v", err)
		}
		if fake.run.Status != store.StatusCompleted {
			t.Errorf("status = %s, want COMPLETED", fake.run.Status)
		}
		want := []map[string]any{
			{"trigger": map[string]any{"name": "Ada"}},
			{"trigger": map[string]any{"name": "Ada"}, "a": "one"},
		}
		if diff := cmp.Diff(want, seen); diff != "" {
			t.Errorf("contexts (-want +got):\n%s", diff)
		}
	})

	t.Run("step error fails the run", func(t *testing.T) {
		t.Parallel()
		registry, err := workflow.NewRegistry(stubAction{actionType: workflow.ActionTypeEmpty, run: func(workflow.StepInput) (workflow.StepOutput, error) {
			return workflow.StepOutput{}, errors.New("boom")
		}})
		if err != nil {
			t.Fatal(err)
		}
		fake := newFakeStore(`[{"id":"a","type":"EMPTY"},{"id":"b","type":"EMPTY"}]`)
		worker := &runWorkflowWorker{exec: &executor{store: fake, registry: registry}}

		if err := worker.Work(t.Context(), args); err != nil {
			t.Fatalf("Work() = %v", err)
		}
		if fake.run.Status != store.StatusFailed {
			t.Errorf("status = %s, want FAILED", fake.run.Status)
		}
	})

	t.Run("pending step parks the run and resume continues from it", func(t *testing.T) {
		t.Parallel()
		var formOutput any
		registry, err := workflow.NewRegistry(
			stubAction{actionType: workflow.ActionTypeForm, run: func(workflow.StepInput) (workflow.StepOutput, error) {
				return workflow.StepOutput{Pending: true}, nil
			}},
			stubAction{actionType: workflow.ActionTypeEmpty, run: func(input workflow.StepInput) (workflow.StepOutput, error) {
				formOutput = input.Context["form"]
				return workflow.StepOutput{}, nil
			}},
		)
		if err != nil {
			t.Fatal(err)
		}
		fake := newFakeStore(`[{"id":"form","type":"FORM"},{"id":"after","type":"EMPTY"}]`)
		exec := &executor{store: fake, registry: registry}

		if err := (&runWorkflowWorker{exec: exec}).Work(t.Context(), args); err != nil {
			t.Fatalf("Work() = %v", err)
		}
		if fake.run.Status != store.StatusRunning {
			t.Fatalf("parked status = %s, want RUNNING", fake.run.Status)
		}

		resume := &river.Job[workflow.ResumeStepArgs]{Args: workflow.ResumeStepArgs{RunID: "run", StepID: "form", Input: json.RawMessage(`{"ok":true}`)}}
		if err := (&resumeStepWorker{exec: exec}).Work(t.Context(), resume); err != nil {
			t.Fatalf("resume Work() = %v", err)
		}
		if fake.run.Status != store.StatusCompleted {
			t.Errorf("status = %s, want COMPLETED", fake.run.Status)
		}
		if diff := cmp.Diff(map[string]any{"ok": true}, formOutput); diff != "" {
			t.Errorf("form output in context (-want +got):\n%s", diff)
		}
	})
}
