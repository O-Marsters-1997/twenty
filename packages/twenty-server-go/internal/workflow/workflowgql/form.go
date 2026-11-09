package workflowgql

import (
	"encoding/json"
	"fmt"
	"regexp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const formStepType = "FORM"

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func invalidRequest(format string, args ...any) error {
	return fmt.Errorf("%s: %w", fmt.Sprintf(format, args...), store.ErrInvalidInput)
}

func validateFormResponse(steps []map[string]any, state json.RawMessage, stepID string, response map[string]any) error {
	var step map[string]any
	for _, candidate := range steps {
		if candidate["id"] == stepID {
			step = candidate
		}
	}
	if step == nil || step["type"] != formStepType {
		return fmt.Errorf("step is not a form step of this run: %w", store.ErrNotFound)
	}
	settings, _ := step["settings"].(map[string]any)
	fields, _ := settings["input"].([]any)
	fieldTypes := make(map[string]any, len(fields))
	for _, field := range fields {
		definition, _ := field.(map[string]any)
		name, _ := definition["name"].(string)
		fieldTypes[name] = definition["type"]
	}
	for name, value := range response {
		fieldType, known := fieldTypes[name]
		if !known {
			return invalidRequest("form response holds values for fields the form does not have")
		}
		if fieldType == "RECORD" && !isRecordPick(value) {
			return invalidRequest("a record field of the form holds no valid record id")
		}
	}
	var parsed struct {
		StepInfos map[string]struct {
			Status string `json:"status"`
		} `json:"stepInfos"`
	}
	if len(state) > 0 {
		if err := json.Unmarshal(state, &parsed); err != nil {
			return fmt.Errorf("decode run state: %w", err)
		}
	}
	if parsed.StepInfos[stepID].Status != "PENDING" {
		return invalidRequest("form step is no longer waiting for an answer")
	}
	return nil
}

func isRecordPick(value any) bool {
	if value == nil {
		return true
	}
	pick, isObject := value.(map[string]any)
	if !isObject {
		return false
	}
	id, hasID := pick["id"]
	if !hasID || id == nil {
		return true
	}
	text, isText := id.(string)
	return isText && uuidPattern.MatchString(text)
}
