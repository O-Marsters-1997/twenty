package workflow

import (
	"fmt"
	"maps"
	"slices"

	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const TriggerStepID = "trigger"

const (
	duplicatedStepOffset = 50
	ifBranchOffsetX      = -200
	elseBranchOffsetX    = 200
	ifElseBranchOffsetY  = 120
	iteratorEmptyOffsetX = 174
	iteratorEmptyOffsetY = 83
)

type Step = map[string]any

func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", store.ErrInvalidInput, fmt.Sprintf(format, args...))
}

func idsOf(value any) []string {
	items, _ := value.([]any)
	ids := make([]string, 0, len(items))
	for _, item := range items {
		if id, ok := item.(string); ok {
			ids = append(ids, id)
		}
	}
	return ids
}

func anyIDs(ids []string) []any {
	out := make([]any, len(ids))
	for i, id := range ids {
		out[i] = id
	}
	return out
}

func mapOf(value any) map[string]any {
	m, _ := value.(map[string]any)
	return m
}

func inputOf(step Step) map[string]any {
	return mapOf(mapOf(step["settings"])["input"])
}

func withInput(step Step, input map[string]any) Step {
	settings := maps.Clone(mapOf(step["settings"]))
	settings["input"] = input
	out := maps.Clone(step)
	out["settings"] = settings
	return out
}

func branchesOf(step Step) []map[string]any {
	items, _ := inputOf(step)["branches"].([]any)
	branches := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if branch := mapOf(item); branch != nil {
			branches = append(branches, branch)
		}
	}
	return branches
}

func withBranches(step Step, branches []map[string]any) Step {
	items := make([]any, len(branches))
	for i, branch := range branches {
		items[i] = branch
	}
	input := maps.Clone(inputOf(step))
	input["branches"] = items
	return withInput(step, input)
}

func baseSettings(input any) map[string]any {
	return map[string]any{
		"outputSchema": map[string]any{},
		"errorHandlingOptions": map[string]any{
			"continueOnFailure": map[string]any{"value": false},
			"retryOnFailure":    map[string]any{"value": float64(0)},
		},
		"input": input,
	}
}

func emptyStep(position map[string]any, nextStepIDs []string) Step {
	step := Step{
		"id": uuid.NewString(), "name": "Add an Action", "type": string(ActionTypeEmpty), "valid": true,
		"settings": baseSettings(map[string]any{}), "position": position,
	}
	if nextStepIDs != nil {
		step["nextStepIds"] = anyIDs(nextStepIDs)
	}
	return step
}

func offsetPosition(position map[string]any, x, y float64) map[string]any {
	px, _ := position["x"].(float64)
	py, _ := position["y"].(float64)
	return map[string]any{"x": px + x, "y": py + y}
}

func BuildStep(stepType, id string, position map[string]any, objectName string, newAgent func() (string, error)) (Step, []Step, error) {
	if id == "" {
		id = uuid.NewString()
	}
	step := Step{"id": id, "valid": false, "nextStepIds": []any{}, "type": stepType}
	if position != nil {
		step["position"] = position
	}
	recordInput := func(input map[string]any) map[string]any {
		input["objectName"] = objectName
		return input
	}
	var extra []Step
	var name string
	var input any
	switch ActionType(stepType) {
	case ActionTypeSendEmail, ActionTypeDraftEmail:
		name = "Send Email"
		if ActionType(stepType) == ActionTypeDraftEmail {
			name = "Draft Email"
		}
		input = map[string]any{
			"connectedAccountId": "", "subject": "", "body": "",
			"recipients": map[string]any{"to": "", "cc": "", "bcc": ""},
		}
	case ActionTypeCreateRecord:
		name, input = "Create Record", recordInput(map[string]any{"objectRecord": map[string]any{}})
	case ActionTypeUpdateRecord:
		name, input = "Update Record", recordInput(map[string]any{"objectRecord": map[string]any{}, "objectRecordId": "", "fieldsToUpdate": []any{}})
	case ActionTypeDeleteRecord:
		name, input = "Delete Record", recordInput(map[string]any{"objectRecordId": ""})
	case ActionTypeUpsertRecord:
		name, input = "Create or Update Record", recordInput(map[string]any{"objectRecord": map[string]any{}, "fieldsToUpdate": []any{}})
	case ActionTypeFindRecords:
		name, input = "Search Records", recordInput(map[string]any{"limit": float64(1), "offset": float64(0)})
	case ActionTypeForm:
		name, input = "Form", []any{}
	case ActionTypeFilter:
		name, input = "Filter", map[string]any{"stepFilterGroups": []any{}, "stepFilters": []any{}}
	case ActionTypeHTTPRequest:
		name = "HTTP Request"
		input = map[string]any{"url": "", "method": "GET", "headers": map[string]any{}, "body": map[string]any{}}
	case ActionTypeAIAgent:
		agentID, err := newAgent()
		if err != nil {
			return nil, nil, fmt.Errorf("create workflow agent: %w", err)
		}
		name, input = "Agent", map[string]any{"agentId": agentID, "prompt": ""}
	case ActionTypeClassify:
		name = "Classify"
		input = map[string]any{"state": "", "questions": []any{map[string]any{
			"id": uuid.NewString(), "name": "", "type": "choice", "instructions": "",
			"criteria": []any{map[string]any{"id": uuid.NewString(), "name": "Lawyer", "description": "Advises clients on legal matters"}},
		}}}
	case ActionTypeIterator:
		loopEmpty := emptyStep(offsetPosition(position, iteratorEmptyOffsetX, iteratorEmptyOffsetY), []string{id})
		name = "Iterator"
		input = map[string]any{"items": []any{}, "initialLoopStepIds": []any{loopEmpty["id"]}, "shouldContinueOnIterationFailure": true}
		extra = []Step{loopEmpty}
	case ActionTypeIfElse:
		ifEmpty := emptyStep(offsetPosition(position, ifBranchOffsetX, ifElseBranchOffsetY), nil)
		elseEmpty := emptyStep(offsetPosition(position, elseBranchOffsetX, ifElseBranchOffsetY), nil)
		groupID := uuid.NewString()
		name = "If/Else"
		input = map[string]any{
			"stepFilterGroups": []any{map[string]any{"id": groupID, "logicalOperator": "AND"}},
			"stepFilters": []any{map[string]any{
				"id": uuid.NewString(), "type": "unknown", "stepOutputKey": "", "operand": "IS", "value": "",
				"stepFilterGroupId": groupID, "positionInStepFilterGroup": float64(0),
			}},
			"branches": []any{
				map[string]any{"id": uuid.NewString(), "filterGroupId": groupID, "nextStepIds": []any{ifEmpty["id"]}},
				map[string]any{"id": uuid.NewString(), "nextStepIds": []any{elseEmpty["id"]}},
			},
		}
		extra = []Step{ifEmpty, elseEmpty}
	case ActionTypeDelay:
		name = "Delay"
		input = map[string]any{"delayType": "DURATION", "duration": map[string]any{"days": float64(0), "hours": float64(0), "minutes": float64(0), "seconds": float64(0)}}
	case ActionTypeEmpty:
		name, input = "Add an Action", map[string]any{}
		step["valid"] = true
	default:
		return nil, nil, invalid("WorkflowActionType '%s' is not supported", stepType)
	}
	settings := baseSettings(input)
	if ActionType(stepType) == ActionTypeHTTPRequest {
		settings["expectedOutputSchema"] = map[string]any{}
	}
	step["name"], step["settings"] = name, settings
	return step, extra, nil
}

func InsertStep(trigger Step, steps []Step, inserted Step, extra []Step, parentID, nextID string, options map[string]any) (Step, []Step, error) {
	var err error
	if parentID != "" {
		trigger, steps, err = linkParent(trigger, steps, inserted["id"].(string), parentID, nextID, options)
		if err != nil {
			return nil, nil, err
		}
	}
	isIfElse := inserted["type"] == string(ActionTypeIfElse)
	placed := maps.Clone(inserted)
	delete(placed, "nextStepIds")
	if nextID != "" && !isIfElse {
		placed["nextStepIds"] = []any{nextID}
	}
	var branchIDs []string
	if isIfElse {
		for _, branch := range branchesOf(inserted) {
			branchIDs = append(branchIDs, idsOf(branch["nextStepIds"])...)
		}
	}
	out := append(slices.Clone(steps), placed)
	for _, step := range extra {
		if nextID != "" && slices.Contains(branchIDs, step["id"].(string)) {
			step = maps.Clone(step)
			step["nextStepIds"] = []any{nextID}
		}
		out = append(out, step)
	}
	return trigger, out, nil
}

func without(ids []string, id string) []string {
	return slices.DeleteFunc(slices.Clone(ids), func(candidate string) bool { return candidate == id })
}

func appendUnique(ids []string, id string) []string {
	if slices.Contains(ids, id) {
		return ids
	}
	return append(slices.Clone(ids), id)
}

func linkParent(trigger Step, steps []Step, insertedID, parentID, nextID string, options map[string]any) (Step, []Step, error) {
	if options != nil {
		updated, err := linkWithOptions(steps, insertedID, parentID, nextID, options)
		return trigger, updated, err
	}
	next := func(ids []string) []any { return anyIDs(appendUnique(without(ids, nextID), insertedID)) }
	if parentID == TriggerStepID {
		if trigger == nil {
			return nil, nil, invalid("cannot insert step from undefined trigger")
		}
		trigger = maps.Clone(trigger)
		trigger["nextStepIds"] = next(idsOf(trigger["nextStepIds"]))
		return trigger, steps, nil
	}
	return trigger, mapSteps(steps, parentID, func(step Step) Step {
		step = maps.Clone(step)
		step["nextStepIds"] = next(idsOf(step["nextStepIds"]))
		return step
	}), nil
}

func mapSteps(steps []Step, id string, update func(Step) Step) []Step {
	out := make([]Step, len(steps))
	for i, step := range steps {
		out[i] = step
		if step["id"] == id {
			out[i] = update(step)
		}
	}
	return out
}

func linkWithOptions(steps []Step, insertedID, parentID, nextID string, options map[string]any) ([]Step, error) {
	settings := mapOf(options["settings"])
	switch options["connectedStepType"] {
	case string(ActionTypeIfElse):
		parent := findStep(steps, parentID)
		if parent == nil || parent["type"] != string(ActionTypeIfElse) {
			return nil, invalid("step %s is not an If/Else action", parentID)
		}
		branches := branchesOf(parent)
		found := false
		for i, branch := range branches {
			if branch["id"] != settings["branchId"] {
				continue
			}
			found = true
			ids := idsOf(branch["nextStepIds"])
			at := slices.Index(ids, nextID)
			switch {
			case nextID == "":
				ids = append(ids, insertedID)
			case at >= 0:
				ids[at] = insertedID
			default:
				return nil, invalid("cannot insert a step on branch %v", settings["branchId"])
			}
			branches[i] = maps.Clone(branch)
			branches[i]["nextStepIds"] = anyIDs(ids)
		}
		if !found {
			return nil, invalid("cannot insert a step on branch %v", settings["branchId"])
		}
		return mapSteps(steps, parentID, func(step Step) Step { return withBranches(step, branches) }), nil
	case string(ActionTypeIterator):
		if connected, _ := settings["isConnectedToLoop"].(bool); !connected {
			return steps, nil
		}
		parent := findStep(steps, parentID)
		if parent == nil || parent["type"] != string(ActionTypeIterator) {
			return nil, invalid("step %s is not an iterator", parentID)
		}
		input := maps.Clone(inputOf(parent))
		input["initialLoopStepIds"] = anyIDs(appendUnique(without(idsOf(input["initialLoopStepIds"]), nextID), insertedID))
		return mapSteps(steps, parentID, func(step Step) Step { return withInput(step, input) }), nil
	}
	return steps, nil
}

func findStep(steps []Step, id string) Step {
	for _, step := range steps {
		if step["id"] == id {
			return step
		}
	}
	return nil
}

func reconnect(ids []string, removed string, children []string) []string {
	out := without(ids, removed)
	for _, child := range children {
		out = appendUnique(out, child)
	}
	return out
}

func RemoveStep(trigger Step, steps []Step, id string) (Step, []Step, []string) {
	if id == TriggerStepID {
		return nil, steps, []string{TriggerStepID}
	}
	target := findStep(steps, id)
	var children []string
	if target != nil {
		children = idsOf(target["nextStepIds"])
	}
	removed := []string{id}
	if target != nil && target["type"] == string(ActionTypeIfElse) {
		for _, branch := range branchesOf(target) {
			for _, childID := range idsOf(branch["nextStepIds"]) {
				if child := findStep(steps, childID); child != nil && child["type"] == string(ActionTypeEmpty) {
					removed = append(removed, childID)
				}
			}
		}
	}
	var replacements []Step
	out := make([]Step, 0, len(steps))
	for _, step := range steps {
		if slices.Contains(removed, step["id"].(string)) {
			continue
		}
		switch {
		case step["type"] == string(ActionTypeIfElse):
			step = removeFromIfElse(step, id, children, removed, target, &replacements)
		case slices.Contains(idsOf(step["nextStepIds"]), id):
			step = maps.Clone(step)
			step["nextStepIds"] = anyIDs(reconnect(idsOf(step["nextStepIds"]), id, children))
		case step["type"] == string(ActionTypeIterator) && slices.Contains(idsOf(inputOf(step)["initialLoopStepIds"]), id):
			input := maps.Clone(inputOf(step))
			input["initialLoopStepIds"] = anyIDs(reconnect(idsOf(input["initialLoopStepIds"]), id, children))
			step = withInput(step, input)
		}
		out = append(out, step)
	}
	out = append(out, replacements...)
	if trigger != nil && slices.Contains(idsOf(trigger["nextStepIds"]), id) {
		trigger = maps.Clone(trigger)
		trigger["nextStepIds"] = anyIDs(reconnect(idsOf(trigger["nextStepIds"]), id, children))
	}
	return trigger, out, removed
}

func removeFromIfElse(step Step, id string, children, removed []string, deleted Step, replacements *[]Step) Step {
	branches := branchesOf(step)
	kept := make([]map[string]any, 0, len(branches))
	for i, branch := range branches {
		ids := idsOf(branch["nextStepIds"])
		if slices.Contains(ids, id) {
			ids = reconnect(ids, id, children)
		}
		ids = slices.DeleteFunc(ids, func(candidate string) bool { return slices.Contains(removed, candidate) })
		_, hasFilter := branch["filterGroupId"]
		isIf, isElse := i == 0, i == len(branches)-1 && !hasFilter
		if (isIf || isElse) && len(ids) == 0 {
			var position map[string]any
			if deleted != nil {
				position = mapOf(deleted["position"])
			}
			if position == nil {
				offset := float64(elseBranchOffsetX)
				if isIf {
					offset = ifBranchOffsetX
				}
				position = offsetPosition(mapOf(step["position"]), offset, ifElseBranchOffsetY)
			}
			replacement := emptyStep(position, nil)
			*replacements = append(*replacements, replacement)
			ids = []string{replacement["id"].(string)}
		}
		if !isIf && !isElse && len(ids) == 0 {
			continue
		}
		branch = maps.Clone(branch)
		branch["nextStepIds"] = anyIDs(ids)
		kept = append(kept, branch)
	}
	out := withBranches(step, kept)
	out["nextStepIds"] = []any{}
	return out
}

func ChangeEdge(trigger Step, steps []Step, source, target string, options map[string]any, add bool) (Step, []Step, bool, error) {
	if options["connectedStepType"] == string(ActionTypeIfElse) {
		return nil, nil, false, invalid("If/Else connections must be updated through their branch settings")
	}
	if findStep(steps, target) == nil {
		return nil, nil, false, fmt.Errorf("%w: target step '%s'", store.ErrNotFound, target)
	}
	edit := func(ids []string) []string {
		if add {
			return appendUnique(ids, target)
		}
		return without(ids, target)
	}
	if source == TriggerStepID {
		if trigger == nil {
			return nil, nil, false, fmt.Errorf("%w: trigger", store.ErrNotFound)
		}
		current := idsOf(trigger["nextStepIds"])
		if slices.Contains(current, target) == add {
			return trigger, steps, false, nil
		}
		trigger = maps.Clone(trigger)
		trigger["nextStepIds"] = anyIDs(edit(current))
		return trigger, steps, true, nil
	}
	sourceStep := findStep(steps, source)
	if sourceStep == nil {
		return nil, nil, false, fmt.Errorf("%w: source step '%s'", store.ErrNotFound, source)
	}
	if options["connectedStepType"] == string(ActionTypeIterator) {
		if sourceStep["type"] != string(ActionTypeIterator) {
			return nil, nil, false, invalid("source step '%s' is not an iterator", source)
		}
		if mapOf(options["settings"])["isConnectedToLoop"] == true {
			current := idsOf(inputOf(sourceStep)["initialLoopStepIds"])
			if slices.Contains(current, target) == add {
				return trigger, steps, false, nil
			}
			input := maps.Clone(inputOf(sourceStep))
			input["initialLoopStepIds"] = anyIDs(edit(current))
			return trigger, mapSteps(steps, source, func(step Step) Step { return withInput(step, input) }), true, nil
		}
	}
	current := idsOf(sourceStep["nextStepIds"])
	if slices.Contains(current, target) == add {
		return trigger, steps, false, nil
	}
	return trigger, mapSteps(steps, source, func(step Step) Step {
		step = maps.Clone(step)
		step["nextStepIds"] = anyIDs(edit(current))
		return step
	}), true, nil
}

func CloneStep(step Step, cloneAgent func(Step) (string, error)) (Step, error) {
	cloned := maps.Clone(step)
	cloned["id"] = uuid.NewString()
	cloned["nextStepIds"] = []any{}
	cloned["position"] = offsetPosition(mapOf(step["position"]), 0, 0)
	switch step["type"] {
	case string(ActionTypeAIAgent):
		agentID, err := cloneAgent(step)
		if err != nil {
			return nil, fmt.Errorf("clone workflow agent: %w", err)
		}
		input := maps.Clone(inputOf(step))
		input["agentId"] = agentID
		return withInput(cloned, input), nil
	case string(ActionTypeIterator):
		input := maps.Clone(inputOf(step))
		input["initialLoopStepIds"] = []any{}
		return withInput(cloned, input), nil
	}
	return cloned, nil
}

func MarkDuplicate(step Step) Step {
	marked := maps.Clone(step)
	name, _ := step["name"].(string)
	marked["name"] = name + " (Duplicate)"
	marked["position"] = offsetPosition(mapOf(step["position"]), duplicatedStepOffset, duplicatedStepOffset)
	return marked
}

func SetPositions(trigger Step, steps []Step, positions map[string]map[string]any) (Step, []Step) {
	if position, ok := positions[TriggerStepID]; ok && trigger != nil {
		trigger = maps.Clone(trigger)
		trigger["position"] = position
	}
	out := make([]Step, len(steps))
	for i, step := range steps {
		out[i] = step
		if position, ok := positions[step["id"].(string)]; ok {
			out[i] = maps.Clone(step)
			out[i]["position"] = position
		}
	}
	return trigger, out
}
