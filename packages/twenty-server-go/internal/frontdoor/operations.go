package frontdoor

import "slices"

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

// DefaultTable blocks the object and field mutations that change the frozen data model.
func DefaultTable() OperationTable {
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
		},
	}
	for _, operation := range viewOperations {
		table[EndpointMetadata][operation] = RouteGo
	}
	for _, operation := range slices.Concat(SkillOperations, ChatOperations, agentOperations) {
		table[EndpointMetadata][operation] = RouteGo
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
}

var viewOperations = []string{
	"FindManyViews", "FindAllViews", "FindFieldsWidgetViews", "FindTableWidgetViews",
	"CreateView", "UpdateView", "DestroyView",
	"CreateManyViewFields", "UpdateViewField", "DestroyViewField",
	"CreateViewFilter", "UpdateViewFilter", "DestroyViewFilter",
	"CreateViewFilterGroup", "UpdateViewFilterGroup", "DestroyViewFilterGroup",
	"CreateViewSort", "UpdateViewSort", "DestroyViewSort",
	"CreateManyViewGroups", "UpdateManyViewGroups",
}

var agentOperations = []string{
	"FindManyAgents", "FindOneAgent", "CreateOneAgent", "UpdateOneAgent", "DeleteOneAgent", "AssignRoleToAgent",
}

var blockedMetadataFields = []string{
	"createOneObject", "updateOneObject", "deleteOneObject",
	"createOneField", "updateOneField", "deleteOneField",
}
