package workflow_test

import (
	"context"
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
)

type fakeAction struct{ actionType workflow.ActionType }

func (f fakeAction) Type() workflow.ActionType { return f.actionType }

func (fakeAction) Run(context.Context, workflow.StepInput) (workflow.StepOutput, error) {
	return workflow.StepOutput{}, nil
}

func TestNewRegistry(t *testing.T) {
	t.Run("rejects a duplicate type", func(t *testing.T) {
		_, err := workflow.NewRegistry(fakeAction{workflow.ActionTypeForm}, fakeAction{workflow.ActionTypeForm})
		if err == nil {
			t.Fatal("NewRegistry(FORM, FORM) error = nil, want duplicate error")
		}
	})
}

func TestRegistry_Lookup(t *testing.T) {
	registry, err := workflow.NewRegistry(fakeAction{workflow.ActionTypeFilter})
	if err != nil {
		t.Fatal(err)
	}

	t.Run("registered type", func(t *testing.T) {
		action, err := registry.Lookup(workflow.ActionTypeFilter)
		if err != nil {
			t.Fatalf("Lookup(FILTER) error = %v, want nil", err)
		}
		if got := action.Type(); got != workflow.ActionTypeFilter {
			t.Errorf("Lookup(FILTER).Type() = %q, want %q", got, workflow.ActionTypeFilter)
		}
	})

	t.Run("unregistered type", func(t *testing.T) {
		_, err := registry.Lookup(workflow.ActionTypeDelay)
		if !errors.Is(err, workflow.ErrUnknownActionType) {
			t.Errorf("Lookup(DELAY) error = %v, want ErrUnknownActionType", err)
		}
	})
}
