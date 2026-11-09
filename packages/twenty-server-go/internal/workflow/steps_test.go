package workflow_test

import (
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

func step(id string, next ...any) workflow.Step {
	return workflow.Step{"id": id, "type": "EMPTY", "nextStepIds": next}
}

func nextIDs(s workflow.Step) any { return s["nextStepIds"] }

func TestBuildStep(t *testing.T) {
	t.Parallel()
	t.Run("classify has a default question", func(t *testing.T) {
		t.Parallel()
		built, extra, err := workflow.BuildStep("CLASSIFY", "classify-1", map[string]any{"x": 1.0, "y": 2.0}, "person", nil)
		if err != nil {
			t.Fatalf("BuildStep() error = %v", err)
		}
		if built["id"] != "classify-1" || built["name"] != "Classify" || built["valid"] != false || len(extra) != 0 {
			t.Errorf("BuildStep() = %v, extra %v, want an invalid Classify step with the given id", built, extra)
		}
	})
	t.Run("if else creates a branch node each", func(t *testing.T) {
		t.Parallel()
		built, extra, err := workflow.BuildStep("IF_ELSE", "", nil, "", nil)
		if err != nil {
			t.Fatalf("BuildStep() error = %v", err)
		}
		if len(extra) != 2 || built["type"] != "IF_ELSE" {
			t.Errorf("BuildStep() = %v, extra %v, want two empty branch steps", built, extra)
		}
	})
	t.Run("unsupported type is invalid input", func(t *testing.T) {
		t.Parallel()
		if _, _, err := workflow.BuildStep("WAIT_FOR_EVENT", "", nil, "", nil); !errors.Is(err, store.ErrInvalidInput) {
			t.Errorf("BuildStep() error = %v, want %v", err, store.ErrInvalidInput)
		}
	})
}

func TestInsertStep(t *testing.T) {
	t.Parallel()
	trigger := workflow.Step{"type": "MANUAL", "nextStepIds": []any{"b"}}
	steps := []workflow.Step{step("b")}

	gotTrigger, gotSteps, err := workflow.InsertStep(trigger, steps, step("a"), nil, workflow.TriggerStepID, "b", nil)
	if err != nil {
		t.Fatalf("InsertStep() error = %v", err)
	}
	if diff := cmp.Diff([]any{"a"}, nextIDs(gotTrigger)); diff != "" {
		t.Errorf("trigger nextStepIds (-want +got):\n%s", diff)
	}
	if len(gotSteps) != 2 || gotSteps[1]["id"] != "a" {
		t.Fatalf("InsertStep() steps = %v, want the new step appended", gotSteps)
	}
	if diff := cmp.Diff([]any{"b"}, nextIDs(gotSteps[1])); diff != "" {
		t.Errorf("inserted nextStepIds (-want +got):\n%s", diff)
	}
}

func TestRemoveStep(t *testing.T) {
	t.Parallel()
	trigger := workflow.Step{"type": "MANUAL", "nextStepIds": []any{"a"}}
	steps := []workflow.Step{step("a", "b"), step("b")}

	gotTrigger, gotSteps, removed := workflow.RemoveStep(trigger, steps, "a")
	if diff := cmp.Diff([]any{"b"}, nextIDs(gotTrigger)); diff != "" {
		t.Errorf("trigger nextStepIds (-want +got):\n%s", diff)
	}
	if len(gotSteps) != 1 || gotSteps[0]["id"] != "b" || len(removed) != 1 {
		t.Errorf("RemoveStep() = %v, removed %v, want only b left", gotSteps, removed)
	}
}

func TestChangeEdge(t *testing.T) {
	t.Parallel()
	steps := []workflow.Step{step("a"), step("b")}

	t.Run("adds once", func(t *testing.T) {
		t.Parallel()
		_, added, changed, err := workflow.ChangeEdge(nil, steps, "a", "b", nil, true)
		if err != nil || !changed {
			t.Fatalf("ChangeEdge() = changed %v, error %v, want a change", changed, err)
		}
		if diff := cmp.Diff([]any{"b"}, nextIDs(added[0])); diff != "" {
			t.Errorf("nextStepIds (-want +got):\n%s", diff)
		}
		if _, _, changed, _ := workflow.ChangeEdge(nil, added, "a", "b", nil, true); changed {
			t.Error("ChangeEdge() of an existing edge changed the steps")
		}
	})
	t.Run("rejects if else connections and missing targets", func(t *testing.T) {
		t.Parallel()
		if _, _, _, err := workflow.ChangeEdge(nil, steps, "a", "b", map[string]any{"connectedStepType": "IF_ELSE"}, true); !errors.Is(err, store.ErrInvalidInput) {
			t.Errorf("if/else ChangeEdge() error = %v, want %v", err, store.ErrInvalidInput)
		}
		if _, _, _, err := workflow.ChangeEdge(nil, steps, "a", "zzz", nil, true); !errors.Is(err, store.ErrNotFound) {
			t.Errorf("missing target ChangeEdge() error = %v, want %v", err, store.ErrNotFound)
		}
	})
}

func TestDiff(t *testing.T) {
	t.Parallel()
	oldValue := map[string]any{"steps": []any{map[string]any{"id": "a", "name": "A"}, "gone"}}
	newValue := map[string]any{"steps": []any{map[string]any{"id": "a", "name": "B"}}, "extra": 1.0}

	want := []any{
		map[string]any{"type": "CHANGE", "path": []any{"steps", 0.0, "name"}, "value": "B", "oldValue": "A"},
		map[string]any{"type": "REMOVE", "path": []any{"steps", 1.0}, "oldValue": "gone"},
		map[string]any{"type": "CREATE", "path": []any{"extra"}, "value": 1.0},
	}
	if diff := cmp.Diff(want, workflow.Diff(oldValue, newValue)); diff != "" {
		t.Errorf("Diff() (-want +got):\n%s", diff)
	}
}
