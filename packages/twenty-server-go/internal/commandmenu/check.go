package commandmenu

import (
	"fmt"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

const (
	engineKeyNavigation      = "NAVIGATION"
	engineKeyTriggerWorkflow = "TRIGGER_WORKFLOW_VERSION"
)

func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", metadata.ErrInvalidInput, fmt.Sprintf(format, args...))
}

func isSet(value any) bool {
	text, isText := value.(string)
	return value != nil && (!isText || text != "")
}

func checkCoherence(row map[string]any) error {
	key, _ := row["engineComponentKey"].(string)
	hasWorkflow := isSet(row["workflowVersionId"]) || isSet(row["coreWorkflowVersionId"])
	switch key {
	case engineKeyTriggerWorkflow:
		if !hasWorkflow {
			return invalid("workflowVersionId is required when engineComponentKey is TRIGGER_WORKFLOW_VERSION")
		}
	case engineKeyNavigation:
		if err := checkNavigationPayload(row["payload"], row["navigationTargetObjectMetadataId"]); err != nil {
			return err
		}
		if hasWorkflow {
			return invalid("workflowVersionId must not be set for engine component key %s", key)
		}
	default:
		if hasWorkflow {
			return invalid("workflowVersionId must not be set for engine component key %s", key)
		}
	}
	return nil
}

func checkNavigationPayload(payload, target any) error {
	object, isObject := payload.(map[string]any)
	if _, legacy := object["objectMetadataItemId"]; legacy {
		return nil
	}
	switch {
	case payload == nil && target == nil:
		return invalid("either a path payload or navigationTargetObjectMetadataId is required when engineComponentKey is NAVIGATION")
	case payload == nil:
		return nil
	case target != nil:
		return invalid("payload and navigationTargetObjectMetadataId are mutually exclusive")
	}
	path, _ := object["path"].(string)
	if !isObject || strings.TrimSpace(path) == "" {
		return invalid(`payload must contain a non-empty "path" property`)
	}
	return nil
}
