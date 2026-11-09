package workflow

import (
	"errors"
	"fmt"
)

// ErrUnknownActionType is returned when no action is registered for a type.
var ErrUnknownActionType = errors.New("unknown action type")

// Registry maps each ActionType to its Action.
type Registry struct {
	actions map[ActionType]Action
}

// NewRegistry builds a registry; a duplicate type is an error.
func NewRegistry(actions ...Action) (*Registry, error) {
	registry := &Registry{actions: make(map[ActionType]Action, len(actions))}
	for _, action := range actions {
		if _, exists := registry.actions[action.Type()]; exists {
			return nil, fmt.Errorf("duplicate action type %q", action.Type())
		}
		registry.actions[action.Type()] = action
	}
	return registry, nil
}

// Lookup returns the action for actionType or ErrUnknownActionType.
func (r *Registry) Lookup(actionType ActionType) (Action, error) {
	action, ok := r.actions[actionType]
	if !ok {
		return nil, fmt.Errorf("%w: %q", ErrUnknownActionType, actionType)
	}
	return action, nil
}
