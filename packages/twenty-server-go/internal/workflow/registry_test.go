package workflow

import (
	"context"
	"errors"
	"testing"
)

type fakeAction struct{ actionType ActionType }

func (f fakeAction) Type() ActionType { return f.actionType }

func (fakeAction) Run(context.Context, StepInput) (StepOutput, error) {
	return StepOutput{}, nil
}

func TestRegistryLookup(t *testing.T) {
	registry, err := NewRegistry(fakeAction{ActionTypeFilter})
	if err != nil {
		t.Fatal(err)
	}

	action, err := registry.Lookup(ActionTypeFilter)
	if err != nil || action.Type() != ActionTypeFilter {
		t.Fatalf("Lookup(FILTER) = %v, %v", action, err)
	}

	if _, err := registry.Lookup(ActionType("CODE")); !errors.Is(err, ErrUnknownActionType) {
		t.Fatalf("Lookup(CODE) error = %v, want ErrUnknownActionType", err)
	}
}

func TestNewRegistryRejectsDuplicate(t *testing.T) {
	if _, err := NewRegistry(fakeAction{ActionTypeForm}, fakeAction{ActionTypeForm}); err == nil {
		t.Fatal("want duplicate error")
	}
}
