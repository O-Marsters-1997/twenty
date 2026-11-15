package frontdoor

import (
	"slices"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

type Endpoint string

const (
	EndpointWorkspace Endpoint = "/graphql"
	EndpointMetadata  Endpoint = "/metadata"
)

type Route string

const (
	RouteGo      Route = "go"
	RouteNode    Route = "node"
	RouteBlocked Route = "blocked"
)

type OperationTable map[Endpoint]map[string]Route // operation name → route; absent means RouteNode

var RuntimeBuiltObjects = []string{
	"person", "company", "note", "task", "opportunity", "dashboard", "attachment", "timelineActivity", "workspaceMember",
}

func RecordOperations(object model.Object) []string {
	singular := strings.ToUpper(object.NameSingular[:1]) + object.NameSingular[1:]
	plural := strings.ToUpper(object.NamePlural[:1]) + object.NamePlural[1:]
	return []string{
		"FindMany" + plural, "FindOne" + singular, "FindDuplicate" + singular,
		"Create" + plural, "CreateOne" + singular, "UpdateOne" + singular, "UpdateMany" + plural,
		"DeleteOne" + singular, "DeleteMany" + plural, "DestroyOne" + singular, "DestroyMany" + plural,
		"RestoreMany" + plural, "Merge" + plural, "GroupBy" + plural,
		"Aggregate" + plural, plural + "GroupByAggregates", plural + "GroupByRecords",
	}
}

func IsStaticRecordOperation(operation string) bool {
	_, ok := staticTable()[EndpointWorkspace][operation]
	return ok
}

// DefaultTable blocks the object and field mutations that change the frozen data model.
func DefaultTable() OperationTable {
	table := staticTable()
	for _, singular := range RuntimeBuiltObjects {
		index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == singular })
		if index < 0 {
			panic("object model has no " + singular + " object")
		}
		for _, operation := range RecordOperations(model.Objects[index]) {
			table[EndpointWorkspace][operation] = RouteGo
		}
	}
	return table
}

func staticTable() OperationTable {
	table := OperationTable{
		EndpointWorkspace: {
			"AggregateTimelineActivities":         RouteGo,
			"TimelineActivitiesGroupByAggregates": RouteGo,
			"TimelineActivitiesGroupByRecords":    RouteGo,
			"AggregateAttachments":                RouteGo,
			"AttachmentsGroupByAggregates":        RouteGo,
			"AttachmentsGroupByRecords":           RouteGo,
			"AggregatePeople":                     RouteGo,
			"PeopleGroupByAggregates":             RouteGo,
			"PeopleGroupByRecords":                RouteGo,
			"AggregateWorkspaceMembers":           RouteGo,
			"WorkspaceMembersGroupByAggregates":   RouteGo,
			"WorkspaceMembersGroupByRecords":      RouteGo,
			"AggregateDashboards":                 RouteGo,
			"DashboardsGroupByAggregates":         RouteGo,
			"DashboardsGroupByRecords":            RouteGo,
			"AggregateCompanies":                  RouteGo,
			"CompaniesGroupByAggregates":          RouteGo,
			"CompaniesGroupByRecords":             RouteGo,
			AnswerToolCallOperation:               RouteGo,
			"AggregateOpportunities":              RouteGo,
			"OpportunitiesGroupByAggregates":      RouteGo,
			"OpportunitiesGroupByRecords":         RouteGo,
		},
		EndpointMetadata: {
			"ObjectMetadataItems":         RouteGo,
			"GetToolIndex":                RouteGo,
			"GetToolInputSchema":          RouteGo,
			"CreateOneObjectMetadataItem": RouteBlocked,
			"UpdateOneObjectMetadataItem": RouteBlocked,
			"DeleteOneObjectMetadataItem": RouteBlocked,
			"CreateOneFieldMetadataItem":  RouteBlocked,
			"UpdateOneFieldMetadataItem":  RouteBlocked,
			"DeleteOneFieldMetadataItem":  RouteBlocked,
			"CreateOneIndexMetadataItem":  RouteBlocked,
			"DeleteOneIndexMetadataItem":  RouteBlocked,
			"MetadataTranslations":        RouteBlocked,
			"SendEmail":                   RouteGo,
		},
	}
	for _, operation := range viewOperations {
		table[EndpointMetadata][operation] = RouteGo
	}
	for _, operation := range slices.Concat(SkillOperations, ChatOperations, agentOperations, MessagingOperations, AccessOperations, WorkspaceSettingsOperations, TwoFactorOperations, SessionOperations, PasswordLoginOperations) {
		table[EndpointMetadata][operation] = RouteGo
	}
	for _, operation := range slices.Concat(WorkflowOperations, WorkflowAuthoringOperations) {
		table[EndpointWorkspace][operation] = RouteGo
	}
	for _, operation := range slices.Concat(TimelineOperations, LoginOperations) {
		table[EndpointWorkspace][operation] = RouteGo
	}
	for _, plural := range []string{"Notes", "NoteTargets", "Tasks", "TaskTargets"} {
		for _, operation := range []string{"Aggregate" + plural, plural + "GroupByAggregates", plural + "GroupByRecords"} {
			table[EndpointWorkspace][operation] = RouteGo
		}
	}
	return table
}

var SkillOperations = []string{
	"FindManySkills", "FindOneSkill", "FindManySkillsForSuggestion",
	"CreateSkill", "UpdateSkill", "DeleteSkill", "ActivateSkill", "DeactivateSkill",
}

var ChatOperations = []string{
	"GetChatMessages", "GetAgentChatOpenThreadsSummary", "AssignAgentChatThread", "UpdateAgentChatThreadInboxState",
	"SendChatMessage", "RetryChatMessage", "StopAgentChatStream", "DeleteQueuedChatMessage", "OnAgentChatEvent",
}

var WorkflowOperations = []string{
	"GetCoreWorkflows", "GetCoreWorkflow", "GetCoreWorkflowsWithCurrentVersions", "GetCoreWorkflowLegacyMapping",
	"GetCoreWorkflowVersions", "GetCoreWorkflowVersion", "GetCoreWorkflowVersionLegacyMapping",
	"StopWorkflowRun", "RetryWorkflowRun", "SubmitFormStep", "UpdateWorkflowRunStep",
	"WorkflowStepConnectedAccountHandle", "TestHttpRequest",
}

var TimelineOperations = []string{
	"GetTimelineThreadsFromObjectRecord", "GetTimelineThreadsFromPersonId",
	"GetTimelineThreadsFromCompanyId", "GetTimelineThreadsFromOpportunityId", "DismissReconnectAccountBanner",
}

const AnswerToolCallOperation = "AnswerToolCall"

var viewOperations = []string{
	"FindManyViews", "FindAllViews", "FindFieldsWidgetViews", "FindTableWidgetViews",
	"CreateView", "UpdateView", "DestroyView",
	"CreateManyViewFields", "UpdateViewField", "DestroyViewField",
	"CreateViewFilter", "UpdateViewFilter", "DestroyViewFilter",
	"CreateViewFilterGroup", "UpdateViewFilterGroup", "DestroyViewFilterGroup",
	"CreateViewSort", "UpdateViewSort", "DestroyViewSort",
	"CreateManyViewGroups", "UpdateManyViewGroups",
}

var WorkflowAuthoringOperations = []string{
	"CreateCoreWorkflow", "UpdateCoreWorkflow", "UpdateCoreWorkflowVisibility", "DuplicateCoreWorkflow",
	"DeleteCoreWorkflows", "DiscardCoreWorkflowDraft", "CreateDraftFromCoreWorkflowVersion",
	"ActivateCoreWorkflowVersion", "DeactivateCoreWorkflowVersion",
	"CreateCoreWorkflowVersionStep", "UpdateCoreWorkflowVersionStep", "UpdateCoreWorkflowVersionTrigger",
	"DeleteCoreWorkflowVersionStep", "DuplicateCoreWorkflowVersionStep",
	"CreateCoreWorkflowVersionEdge", "DeleteCoreWorkflowVersionEdge", "UpdateCoreWorkflowVersionPositions",
}

var agentOperations = []string{
	"FindManyAgents", "FindOneAgent", "CreateOneAgent", "UpdateOneAgent", "DeleteOneAgent", "AssignRoleToAgent",
}

var MessagingOperations = []string{
	"MyConnectedAccounts", "ApplicationConnectedAccounts", "DeleteConnectedAccount", "DisconnectConnectedAccount",
	"MyMessageChannels", "UpdateMessageChannel", "CreateEmailGroupChannel", "UpdateEmailGroupChannel", "DeleteEmailGroupChannel",
	"MyCalendarChannels", "UpdateCalendarChannel",
	"SendMessageCampaign", "CancelMessageCampaign", "SendMessageCampaignTest", "PreviewMessageCampaignAudience",
}

var AccessOperations = []string{
	"GetWebhooks", "GetWebhook", "CreateWebhook", "UpdateWebhook", "DeleteWebhook",
	"GetApiKeys", "GetApiKey", "GetApiKeyRoles", "CreateApiKey", "UpdateApiKey", "RevokeApiKey", "AssignRoleToApiKey",
	"GenerateApiKeyToken", "GeneratePlaygroundToken",
	"GetRoles", "GetRole", "CreateOneRole", "UpdateOneRole", "DeleteOneRole",
	"UpsertFieldPermissions", "UpsertObjectPermissions", "UpsertPermissionFlags",
}

var WorkspaceSettingsOperations = []string{"UpdateWorkspace", "UpdateWorkspaceAllowedIframeOrigins"}

var LoginOperations = []string{"getAuthTokensFromOTP", "getAuthTokensFromTwoFactorAuthenticationRecoveryCode"}

var TwoFactorOperations = []string{
	"initiateOTPProvisioningForAuthenticatedUser", "verifyTwoFactorAuthenticationMethodForAuthenticatedUser",
	"deleteTwoFactorAuthenticationMethod", "twoFactorAuthenticationRecoveryStatus",
	"generateTwoFactorAuthenticationRecoveryCode", "revokeTwoFactorAuthenticationRecoveryCode",
}

var CurrentUserOperations = []string{"GetCurrentUser"}

var SessionOperations = []string{"getAuthTokensFromLoginToken", "RenewToken", "SignOut"}

var blockedMetadataFields = []string{
	"createOneObject", "updateOneObject", "deleteOneObject",
	"createOneField", "updateOneField", "deleteOneField",
}

var PasswordLoginOperations = []string{"GetLoginTokenFromCredentials", "SignIn"}
