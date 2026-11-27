package frontdoor

type Endpoint string

const (
	EndpointWorkspace Endpoint = "/graphql"
	EndpointMetadata  Endpoint = "/metadata"
)

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
	"FindManyAgents", "FindOneAgent", "CreateOneAgent", "UpdateOneAgent", "DeleteOneAgent", "AssignRoleToAgent", "GetAgentRuns",
}

var MessagingOperations = []string{
	"MyConnectedAccounts", "ApplicationConnectedAccounts", "DeleteConnectedAccount", "DisconnectConnectedAccount",
	"MyMessageChannels", "UpdateMessageChannel", "CreateEmailGroupChannel", "UpdateEmailGroupChannel", "DeleteEmailGroupChannel",
	"MyCalendarChannels", "UpdateCalendarChannel",
	"SendMessageCampaign", "CancelMessageCampaign", "SendMessageCampaignTest", "PreviewMessageCampaignAudience",
}

var LoginOperations = []string{"getAuthTokensFromOTP", "getAuthTokensFromTwoFactorAuthenticationRecoveryCode", "initiateOTPProvisioning"}
var AccessOperations = []string{
	"GetWebhooks", "GetWebhook", "CreateWebhook", "UpdateWebhook", "DeleteWebhook",
	"GetApiKeys", "GetApiKey", "GetApiKeyRoles", "CreateApiKey", "UpdateApiKey", "RevokeApiKey", "AssignRoleToApiKey",
	"GenerateApiKeyToken", "GeneratePlaygroundToken",
	"GetRoles", "GetRole", "CreateOneRole", "UpdateOneRole", "DeleteOneRole",
	"UpsertFieldPermissions", "UpsertObjectPermissions", "UpsertPermissionFlags",
}

var TwoFactorOperations = []string{
	"initiateOTPProvisioningForAuthenticatedUser", "verifyTwoFactorAuthenticationMethodForAuthenticatedUser",
	"deleteTwoFactorAuthenticationMethod", "twoFactorAuthenticationRecoveryStatus",
	"generateTwoFactorAuthenticationRecoveryCode", "revokeTwoFactorAuthenticationRecoveryCode",
}

var SessionOperations = []string{"getAuthTokensFromLoginToken", "RenewToken", "SignOut"}

var SessionManagementOperations = []string{"CurrentUserSessions", "RevokeUserSession", "RevokeAllOtherUserSessions", "generateTransientToken"}

var InvitationOperations = []string{
	"GetWorkspaceInvitations", "DeleteWorkspaceInvitation", "GetApprovedAccessDomains", "DeleteApprovedAccessDomain",
}

var PageLayoutOperations = []string{
	"FindAllRecordFormPageLayouts", "FindAllRecordPageLayouts", "FindAllStandalonePageLayouts", "FindOnePageLayout", "FindOnePageLayoutType",
	"UpdatePageLayoutWidgetIsActive", "UpdatePageLayoutWithTabsAndWidgets", "DuplicateDashboard",
}

var ApplicationOperations = []string{"FindManyApplications", "FindManyApplicationsForToolTable", "FindManyTimelineActivityTypes"}

var FileOperations = []string{
	"CreateFileUpload", "CompleteFileUpload", "CreateNewWorkspaceLogoUpload", "CompleteNewWorkspaceLogoUpload",
	"CompleteWorkspaceLogoUpload", "CompleteWorkspaceMemberProfilePictureUpload",
}

var blockedMetadataFields = []string{
	"createOneObject", "updateOneObject", "deleteOneObject",
	"createOneField", "updateOneField", "deleteOneField",
}

var PasswordLoginOperations = []string{"GetLoginTokenFromCredentials", "SignIn"}

var PublicWorkspaceOperations = []string{
	"GetPublicWorkspaceDataByDomain", "GetPublicWorkspaceDataById", "GetWorkspaceFromInviteHash", "CheckUserExists",
}

var WorkspaceDataOperations = []string{"GetWorkspaceCreationDefaults", "CheckWorkspaceSubdomainAvailability", "GetWorkspaceIframeOrigins"}

var WorkspaceSettingsOperations = []string{"UpdateWorkspace", "UpdateWorkspaceAllowedIframeOrigins", "ActivateWorkspace"}

var blockedMetadataOperations = []string{
	"CreateOneObjectMetadataItem", "UpdateOneObjectMetadataItem", "DeleteOneObjectMetadataItem",
	"CreateOneFieldMetadataItem", "UpdateOneFieldMetadataItem", "DeleteOneFieldMetadataItem",
}
