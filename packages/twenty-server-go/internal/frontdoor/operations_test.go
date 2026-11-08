package frontdoor_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

func TestDefaultTable_RoutesNoteAndTaskAggregatesToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointWorkspace]
	for _, operation := range []string{
		"AggregateNotes", "NotesGroupByAggregates", "NotesGroupByRecords",
		"AggregateNoteTargets", "NoteTargetsGroupByAggregates", "NoteTargetsGroupByRecords",
		"AggregateTasks", "TasksGroupByAggregates", "TasksGroupByRecords",
		"AggregateTaskTargets", "TaskTargetsGroupByAggregates", "TaskTargetsGroupByRecords",
	} {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}

func TestDefaultTable_RoutesSkillOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range []string{
		"FindManySkills", "FindOneSkill", "FindManySkillsForSuggestion",
		"CreateSkill", "UpdateSkill", "DeleteSkill", "ActivateSkill", "DeactivateSkill",
	} {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}
