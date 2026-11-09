package workflow_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
)

func runAction(t *testing.T, actionType workflow.ActionType, settings string, stepContext map[string]any) (workflow.StepOutput, error) {
	t.Helper()
	registry, err := workflow.NewRegistry(workflow.ControlFlowActions()...)
	if err != nil {
		t.Fatalf("NewRegistry() error = %v", err)
	}
	action, err := registry.Lookup(actionType)
	if err != nil {
		t.Fatalf("Lookup(%s) error = %v", actionType, err)
	}
	return action.Run(context.Background(), workflow.StepInput{
		StepID:   "iterator",
		Settings: json.RawMessage(settings),
		Context:  stepContext,
	})
}

const filterSettings = `{
  "stepFilterGroups": [{"id": "g1", "logicalOperator": "AND"}],
  "stepFilters": [{"type": "TEXT", "stepOutputKey": "{{trigger.status}}", "operand": "IS", "value": "open", "stepFilterGroupId": "g1"}]
}`

func TestFilterAction_Run(t *testing.T) {
	tests := []struct {
		name     string
		settings string
		context  map[string]any
		want     map[string]any
	}{
		{"true branch", filterSettings, map[string]any{"trigger": map[string]any{"status": "open"}}, map[string]any{"matchesFilter": true}},
		{"false branch", filterSettings, map[string]any{"trigger": map[string]any{"status": "closed"}}, map[string]any{"matchesFilter": false}},
		{"no filters configured", `{}`, nil, map[string]any{"shouldEndWorkflowRun": false}},
		{"null variable swaps to emptiness", `{
		  "stepFilterGroups": [{"id": "g1", "logicalOperator": "AND"}],
		  "stepFilters": [{"type": "TEXT", "stepOutputKey": "{{trigger.name}}", "operand": "IS", "value": "{{trigger.missing}}", "stepFilterGroupId": "g1"}]
		}`, map[string]any{"trigger": map[string]any{"name": ""}}, map[string]any{"matchesFilter": true}},
		{"OR group", `{
		  "stepFilterGroups": [{"id": "g1", "logicalOperator": "OR"}],
		  "stepFilters": [
		    {"type": "NUMBER", "stepOutputKey": "{{trigger.n}}", "operand": "GREATER_THAN_OR_EQUAL", "value": "10", "stepFilterGroupId": "g1"},
		    {"type": "NUMBER", "stepOutputKey": "{{trigger.n}}", "operand": "LESS_THAN_OR_EQUAL", "value": "3", "stepFilterGroupId": "g1"}]
		}`, map[string]any{"trigger": map[string]any{"n": float64(2)}}, map[string]any{"matchesFilter": true}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := runAction(t, workflow.ActionTypeFilter, tt.settings, tt.context)
			if err != nil {
				t.Fatalf("Run() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got.Result); diff != "" {
				t.Errorf("Run() result (-want +got):\n%s", diff)
			}
			if got.Pending {
				t.Error("Run() Pending = true, want false")
			}
		})
	}
}

const ifElseSettings = `{
  "stepFilterGroups": [{"id": "g1", "logicalOperator": "AND"}],
  "stepFilters": [{"type": "NUMBER", "stepOutputKey": "{{trigger.amount}}", "operand": "GREATER_THAN_OR_EQUAL", "value": "100", "stepFilterGroupId": "g1"}],
  "branches": [
    {"id": "big", "filterGroupId": "g1", "nextStepIds": ["a"]},
    {"id": "else", "nextStepIds": ["b"]}
  ]
}`

func TestIfElseAction_Run(t *testing.T) {
	tests := []struct {
		name   string
		amount float64
		want   string
	}{
		{"true branch", 150, "big"},
		{"false falls to else", 5, "else"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := runAction(t, workflow.ActionTypeIfElse, ifElseSettings, map[string]any{"trigger": map[string]any{"amount": tt.amount}})
			if err != nil {
				t.Fatalf("Run() error = %v", err)
			}
			if diff := cmp.Diff(map[string]any{"matchingBranchId": tt.want}, got.Result); diff != "" {
				t.Errorf("Run() result (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("errors", func(t *testing.T) {
		errorTests := []struct{ name, settings string }{
			{"no branches", `{"stepFilterGroups": [], "stepFilters": [], "branches": []}`},
			{"missing filters", `{"branches": [{"id": "a"}]}`},
			{"branch references missing group", `{"stepFilterGroups": [], "stepFilters": [], "branches": [{"id": "a", "filterGroupId": "nope"}]}`},
		}
		for _, tt := range errorTests {
			t.Run(tt.name, func(t *testing.T) {
				_, err := runAction(t, workflow.ActionTypeIfElse, tt.settings, nil)
				if !errors.Is(err, workflow.ErrInvalidStepInput) {
					t.Errorf("Run() error = %v, want ErrInvalidStepInput", err)
				}
			})
		}
	})
}

func TestIteratorAction_Run(t *testing.T) {
	const settings = `{"items": "{{trigger.list}}", "initialLoopStepIds": ["s1"]}`
	list := map[string]any{"trigger": map[string]any{"list": []any{"a", "b"}}}
	withPrevious := func(index int) map[string]any {
		return map[string]any{"trigger": list["trigger"], "iterator": map[string]any{"currentItemIndex": float64(index)}}
	}

	tests := []struct {
		name     string
		settings string
		context  map[string]any
		want     map[string]any
	}{
		{"first item", settings, list, map[string]any{"currentItemIndex": 0, "currentItem": "a", "hasProcessedAllItems": false}},
		{"next item", settings, withPrevious(0), map[string]any{"currentItemIndex": 1, "currentItem": "b", "hasProcessedAllItems": false}},
		{"all processed", settings, withPrevious(1), map[string]any{"currentItemIndex": 2, "hasProcessedAllItems": true}},
		{"empty list", settings, map[string]any{"trigger": map[string]any{"list": []any{}}}, map[string]any{"currentItemIndex": 0, "hasProcessedAllItems": true}},
		{"items as JSON string", `{"items": "[1,2]", "initialLoopStepIds": ["s1"]}`, nil, map[string]any{"currentItemIndex": 0, "currentItem": float64(1), "hasProcessedAllItems": false}},
		{"no loop steps", `{"items": [1], "initialLoopStepIds": []}`, nil, map[string]any{"currentItemIndex": 0, "hasProcessedAllItems": true}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := runAction(t, workflow.ActionTypeIterator, tt.settings, tt.context)
			if err != nil {
				t.Fatalf("Run() error = %v", err)
			}
			if diff := cmp.Diff(tt.want, got.Result); diff != "" {
				t.Errorf("Run() result (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("non-array items", func(t *testing.T) {
		_, err := runAction(t, workflow.ActionTypeIterator, `{"items": {"a": 1}, "initialLoopStepIds": ["s1"]}`, nil)
		if !errors.Is(err, workflow.ErrInvalidStepInput) {
			t.Errorf("Run() error = %v, want ErrInvalidStepInput", err)
		}
	})
}

func TestEmptyAction_Run(t *testing.T) {
	got, err := runAction(t, workflow.ActionTypeEmpty, `{}`, nil)
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if diff := cmp.Diff(workflow.StepOutput{Result: map[string]any{}}, got); diff != "" {
		t.Errorf("Run() (-want +got):\n%s", diff)
	}
}

func TestFormAction_Run(t *testing.T) {
	got, err := runAction(t, workflow.ActionTypeForm, `{}`, nil)
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if diff := cmp.Diff(workflow.StepOutput{Pending: true}, got); diff != "" {
		t.Errorf("Run() (-want +got):\n%s", diff)
	}
}

func TestDelayAction_Run(t *testing.T) {
	t.Run("duration parks the run until now plus duration", func(t *testing.T) {
		before := time.Now()
		got, err := runAction(t, workflow.ActionTypeDelay, `{"delayType": "DURATION", "duration": {"minutes": 5, "seconds": ""}}`, nil)
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		if !got.Pending {
			t.Error("Run() Pending = false, want true")
		}
		resumeAt, err := time.Parse(time.RFC3339Nano, got.Result.(map[string]any)["resumeAt"].(string))
		if err != nil {
			t.Fatalf("resumeAt parse error = %v", err)
		}
		if wait := resumeAt.Sub(before); wait < 5*time.Minute || wait > 6*time.Minute {
			t.Errorf("resumeAt - now = %v, want about 5m", wait)
		}
	})

	t.Run("scheduled date parks until that date", func(t *testing.T) {
		got, err := runAction(t, workflow.ActionTypeDelay, `{"delayType": "SCHEDULED_DATE", "scheduledDateTime": "{{trigger.at}}"}`,
			map[string]any{"trigger": map[string]any{"at": "2999-01-01T00:00:00Z"}})
		if err != nil {
			t.Fatalf("Run() error = %v", err)
		}
		want := workflow.StepOutput{Pending: true, Result: map[string]any{"resumeAt": "2999-01-01T00:00:00Z"}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("Run() (-want +got):\n%s", diff)
		}
	})

	t.Run("errors", func(t *testing.T) {
		errorTests := []struct{ name, settings string }{
			{"date in the past", `{"delayType": "SCHEDULED_DATE", "scheduledDateTime": "2000-01-01T00:00:00Z"}`},
			{"missing date", `{"delayType": "SCHEDULED_DATE"}`},
			{"missing duration", `{"delayType": "DURATION"}`},
			{"negative duration", `{"delayType": "DURATION", "duration": {"hours": -1}}`},
			{"over a year", `{"delayType": "DURATION", "duration": {"days": 366}}`},
			{"unknown type", `{"delayType": "SOMETIME"}`},
		}
		for _, tt := range errorTests {
			t.Run(tt.name, func(t *testing.T) {
				_, err := runAction(t, workflow.ActionTypeDelay, tt.settings, nil)
				if !errors.Is(err, workflow.ErrInvalidStepInput) {
					t.Errorf("Run() error = %v, want ErrInvalidStepInput", err)
				}
			})
		}
	})
}
