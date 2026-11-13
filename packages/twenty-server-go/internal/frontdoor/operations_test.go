package frontdoor_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

func TestDefaultTable_RoutesAgentOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range []string{"FindManyAgents", "FindOneAgent", "CreateOneAgent", "UpdateOneAgent", "DeleteOneAgent", "AssignRoleToAgent"} {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}

func TestDefaultTable_RoutesMessagingOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range []string{
		"MyConnectedAccounts", "ApplicationConnectedAccounts", "DeleteConnectedAccount", "DisconnectConnectedAccount",
		"MyMessageChannels", "UpdateMessageChannel", "CreateEmailGroupChannel", "UpdateEmailGroupChannel", "DeleteEmailGroupChannel",
		"MyCalendarChannels", "UpdateCalendarChannel",
		"SendMessageCampaign", "CancelMessageCampaign", "SendMessageCampaignTest", "PreviewMessageCampaignAudience",
	} {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}

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

func TestDefaultTable_RoutesTimelineOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointWorkspace]
	for _, operation := range frontdoor.TimelineOperations {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
}

func TestDefaultTable_RoutesSendEmailToGo(t *testing.T) {
	t.Parallel()
	if got := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]["SendEmail"]; got != frontdoor.RouteGo {
		t.Errorf("route of SendEmail = %q, want %q", got, frontdoor.RouteGo)
	}
}

func TestDefaultTable_RoutesTwoFactorOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range frontdoor.TwoFactorOperations {
		if table[operation] != frontdoor.RouteGo {
			t.Errorf("route of %s = %q, want %q", operation, table[operation], frontdoor.RouteGo)
		}
	}
	if got := table["initiateOTPProvisioning"]; got == frontdoor.RouteGo {
		t.Error("initiateOTPProvisioning is public and needs login-token verification, so it stays on Node")
	}
}

func TestDefaultTable_RoutesSessionOperationsToGo(t *testing.T) {
	t.Parallel()
	table := frontdoor.DefaultTable()[frontdoor.EndpointMetadata]
	for _, operation := range []string{"getAuthTokensFromLoginToken", "RenewToken", "SignOut"} {
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
