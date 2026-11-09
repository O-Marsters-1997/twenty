package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"
)

// ErrInvalidStepInput is returned when a step's settings cannot be run.
var ErrInvalidStepInput = errors.New("invalid step input")

const (
	maxIterations     = 10000
	maxDelayDuration  = 365 * 24 * time.Hour
	delayTypeDate     = "SCHEDULED_DATE"
	delayTypeDuration = "DURATION"
)

// ControlFlowActions returns the FILTER, IF_ELSE, ITERATOR, EMPTY, DELAY and
// FORM actions for registration.
func ControlFlowActions() []Action {
	return []Action{filterAction{}, ifElseAction{}, iteratorAction{}, emptyAction{}, delayAction{}, formAction{}}
}

func decodeSettings(settings json.RawMessage, into any) error {
	if len(settings) == 0 {
		return nil
	}
	if err := json.Unmarshal(settings, into); err != nil {
		return fmt.Errorf("decode settings: %w", errors.Join(err, ErrInvalidStepInput))
	}
	return nil
}

type filterAction struct{}

func (filterAction) Type() ActionType { return ActionTypeFilter }

func (filterAction) Run(_ context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		StepFilterGroups *[]stepFilterGroup `json:"stepFilterGroups"`
		StepFilters      *[]stepFilter      `json:"stepFilters"`
	}
	if err := decodeSettings(input.Settings, &settings); err != nil {
		return StepOutput{}, err
	}
	if settings.StepFilterGroups == nil || settings.StepFilters == nil {
		return StepOutput{Result: map[string]any{"shouldEndWorkflowRun": false}}, nil
	}
	matches, err := evaluateFilterConditions(*settings.StepFilterGroups, resolveFilters(*settings.StepFilters, input.Context))
	if err != nil {
		return StepOutput{}, err
	}
	return StepOutput{Result: map[string]any{"matchesFilter": matches}}, nil
}

type ifElseAction struct{}

func (ifElseAction) Type() ActionType { return ActionTypeIfElse }

func (ifElseAction) Run(_ context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		StepFilterGroups *[]stepFilterGroup `json:"stepFilterGroups"`
		StepFilters      *[]stepFilter      `json:"stepFilters"`
		Branches         []struct {
			ID            string `json:"id"`
			FilterGroupID string `json:"filterGroupId"`
		} `json:"branches"`
	}
	if err := decodeSettings(input.Settings, &settings); err != nil {
		return StepOutput{}, err
	}
	if len(settings.Branches) == 0 {
		return StepOutput{}, fmt.Errorf("if-else needs at least one branch: %w", ErrInvalidStepInput)
	}
	if settings.StepFilterGroups == nil || settings.StepFilters == nil {
		return StepOutput{}, fmt.Errorf("if-else needs stepFilterGroups and stepFilters: %w", ErrInvalidStepInput)
	}
	groups := *settings.StepFilterGroups
	for _, branch := range settings.Branches {
		if branch.FilterGroupID != "" && !slices.ContainsFunc(groups, func(group stepFilterGroup) bool { return group.ID == branch.FilterGroupID }) {
			return StepOutput{}, fmt.Errorf("branch %q references missing filter group %q: %w", branch.ID, branch.FilterGroupID, ErrInvalidStepInput)
		}
	}

	filters := resolveFilters(*settings.StepFilters, input.Context)
	for _, branch := range settings.Branches {
		if branch.FilterGroupID == "" {
			return StepOutput{Result: map[string]any{"matchingBranchId": branch.ID}}, nil
		}
		branchGroups := descendantGroups(branch.FilterGroupID, groups)
		var branchFilters []resolvedFilter
		for _, filter := range filters {
			if slices.ContainsFunc(branchGroups, func(group stepFilterGroup) bool { return group.ID == filter.stepFilterGroupID }) {
				branchFilters = append(branchFilters, filter)
			}
		}
		matched, err := evaluateFilterConditions(branchGroups, branchFilters)
		if err != nil {
			return StepOutput{}, err
		}
		if matched {
			return StepOutput{Result: map[string]any{"matchingBranchId": branch.ID}}, nil
		}
	}
	return StepOutput{}, errors.New("no matching branch found in if-else action")
}

func descendantGroups(rootID string, groups []stepFilterGroup) []stepFilterGroup {
	index := slices.IndexFunc(groups, func(group stepFilterGroup) bool { return group.ID == rootID })
	if index < 0 {
		return nil
	}
	collected := []stepFilterGroup{groups[index]}
	for _, group := range groups {
		if group.ParentStepFilterGroupID == rootID {
			collected = append(collected, descendantGroups(group.ID, groups)...)
		}
	}
	return collected
}

type iteratorAction struct{}

func (iteratorAction) Type() ActionType { return ActionTypeIterator }

func (iteratorAction) Run(_ context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		Items              any      `json:"items"`
		InitialLoopStepIDs []string `json:"initialLoopStepIds"`
	}
	if err := decodeSettings(input.Settings, &settings); err != nil {
		return StepOutput{}, err
	}

	items := resolveVariables(settings.Items, input.Context)
	if text, ok := items.(string); ok {
		var parsed any
		if err := json.Unmarshal([]byte(text), &parsed); err != nil {
			return StepOutput{}, fmt.Errorf("iterator items must be an array: %w", errors.Join(err, ErrInvalidStepInput))
		}
		items = parsed
	}
	list, ok := items.([]any)
	if !ok {
		return StepOutput{}, fmt.Errorf("iterator items must be an array: %w", ErrInvalidStepInput)
	}

	if len(settings.InitialLoopStepIDs) == 0 || len(list) == 0 {
		return StepOutput{Result: map[string]any{"currentItemIndex": 0, "hasProcessedAllItems": true}}, nil
	}

	index := 0
	if previous, ok := input.Context[input.StepID].(map[string]any); ok {
		if previousIndex, ok := toNumber(previous["currentItemIndex"]); ok {
			index = int(previousIndex) + 1
		}
	}
	if index >= maxIterations {
		return StepOutput{}, errors.New("iterator has reached the maximum number of iterations")
	}

	result := map[string]any{"currentItemIndex": index, "hasProcessedAllItems": index >= len(list)}
	if index < len(list) {
		result["currentItem"] = list[index]
	}
	return StepOutput{Result: result}, nil
}

type emptyAction struct{}

func (emptyAction) Type() ActionType { return ActionTypeEmpty }

func (emptyAction) Run(context.Context, StepInput) (StepOutput, error) {
	return StepOutput{Result: map[string]any{}}, nil
}

type formAction struct{}

func (formAction) Type() ActionType { return ActionTypeForm }

func (formAction) Run(context.Context, StepInput) (StepOutput, error) {
	return StepOutput{Pending: true}, nil
}

type delayAction struct{}

func (delayAction) Type() ActionType { return ActionTypeDelay }

func (delayAction) Run(_ context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		DelayType         string         `json:"delayType"`
		ScheduledDateTime string         `json:"scheduledDateTime"`
		Duration          map[string]any `json:"duration"`
	}
	if err := decodeSettings(input.Settings, &settings); err != nil {
		return StepOutput{}, err
	}
	var resumeAt time.Time
	switch settings.DelayType {
	case delayTypeDate:
		scheduled, err := parseTime(resolveVariables(settings.ScheduledDateTime, input.Context))
		if settings.ScheduledDateTime == "" || err != nil {
			return StepOutput{}, fmt.Errorf("scheduled date time is required and must be a date: %w", ErrInvalidStepInput)
		}
		if scheduled.Before(time.Now()) {
			return StepOutput{}, fmt.Errorf("scheduled date cannot be in the past: %w", ErrInvalidStepInput)
		}
		resumeAt = scheduled
	case delayTypeDuration:
		if settings.Duration == nil {
			return StepOutput{}, fmt.Errorf("duration is required for duration delay: %w", ErrInvalidStepInput)
		}
		parts, ok := resolveVariables(settings.Duration, input.Context).(map[string]any)
		if !ok {
			return StepOutput{}, fmt.Errorf("duration must be an object: %w", ErrInvalidStepInput)
		}
		duration, err := durationFromParts(parts)
		if err != nil {
			return StepOutput{}, err
		}
		resumeAt = time.Now().Add(duration)
	default:
		return StepOutput{}, fmt.Errorf("invalid delay type %q: %w", settings.DelayType, ErrInvalidStepInput)
	}

	return StepOutput{Pending: true, Result: map[string]any{"resumeAt": resumeAt.UTC().Format(time.RFC3339Nano)}}, nil
}

func durationFromParts(parts map[string]any) (time.Duration, error) {
	units := map[string]time.Duration{"days": 24 * time.Hour, "hours": time.Hour, "minutes": time.Minute, "seconds": time.Second}
	var total time.Duration
	for name, unit := range units {
		value := parts[name]
		if value == nil || value == "" {
			continue
		}
		count, ok := toNumber(value)
		if !ok || count < 0 {
			return 0, fmt.Errorf("duration must be made of non-negative numbers: %w", ErrInvalidStepInput)
		}
		total += time.Duration(count * float64(unit))
	}
	if total > maxDelayDuration {
		return 0, fmt.Errorf("duration cannot exceed one year: %w", ErrInvalidStepInput)
	}
	return total, nil
}
