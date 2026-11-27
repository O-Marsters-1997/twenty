package commandmenu

import (
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/overrides"
)

func TestInterpolateNavigation(t *testing.T) {
	t.Parallel()
	i18n := overrides.ApplicationCatalog{Translator: identityTranslator{}, StandardApplicationID: "standard"}.For("standard")
	people := &navigationTarget{LabelPlural: "people", Icon: "IconUser"}
	label, short, icon := "Go to {objectLabelPlural}", "{objectLabelPlural}", "{objectIcon}"
	literal, clientSide := "Go to People", "Create {objectLabelSingular}"

	tests := []struct {
		name     string
		resolved *string
		target   *navigationTarget
		want     string
	}{
		{"label", &label, people, "Go to People"},
		{"short label", &short, people, "People"},
		{"icon", &icon, people, "IconUser"},
		{"literal label", &literal, people, "Go to People"},
		{"placeholder left to the client", &clientSide, people, "Create {objectLabelSingular}"},
		{"overridden target label", &short, &navigationTarget{LabelPlural: "x", Overrides: map[string]any{"labelPlural": "Contacts"}}, "Contacts"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := interpolateNavigation(tt.resolved, tt.target, i18n)
			if got == nil || *got != tt.want {
				t.Errorf("interpolateNavigation() = %v, want %q", got, tt.want)
			}
		})
	}

	t.Run("missing target or value", func(t *testing.T) {
		t.Parallel()
		if got := interpolateNavigation(&label, nil, i18n); got != nil {
			t.Errorf("without target = %q, want nil", *got)
		}
		if got := interpolateNavigation(nil, people, i18n); got != nil {
			t.Errorf("without value = %q, want nil", *got)
		}
	})
}

func TestCheckCoherence(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		row  map[string]any
		ok   bool
	}{
		{"plain item", map[string]any{"engineComponentKey": "CREATE_NEW_RECORD"}, true},
		{"plain item with workflow", map[string]any{"engineComponentKey": "CREATE_NEW_RECORD", "workflowVersionId": "w"}, false},
		{"trigger with core version", map[string]any{"engineComponentKey": "TRIGGER_WORKFLOW_VERSION", "coreWorkflowVersionId": "w"}, true},
		{"trigger without version", map[string]any{"engineComponentKey": "TRIGGER_WORKFLOW_VERSION"}, false},
		{"navigation with path", map[string]any{"engineComponentKey": "NAVIGATION", "payload": map[string]any{"path": "/a"}}, true},
		{"navigation with target", map[string]any{"engineComponentKey": "NAVIGATION", "navigationTargetObjectMetadataId": "o"}, true},
		{"navigation with neither", map[string]any{"engineComponentKey": "NAVIGATION"}, false},
		{"navigation with both", map[string]any{"engineComponentKey": "NAVIGATION", "payload": map[string]any{"path": "/a"}, "navigationTargetObjectMetadataId": "o"}, false},
		{"navigation with blank path", map[string]any{"engineComponentKey": "NAVIGATION", "payload": map[string]any{"path": " "}}, false},
		{"navigation with legacy payload", map[string]any{"engineComponentKey": "NAVIGATION", "payload": map[string]any{"objectMetadataItemId": "o"}}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := checkCoherence(tt.row)
			if tt.ok && err != nil {
				t.Errorf("checkCoherence() = %v, want nil", err)
			}
			if !tt.ok && !errors.Is(err, metadata.ErrInvalidInput) {
				t.Errorf("checkCoherence() = %v, want ErrInvalidInput", err)
			}
		})
	}
}
