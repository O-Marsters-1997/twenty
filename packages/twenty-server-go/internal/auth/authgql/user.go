package authgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

func (r *queryResolver) CurrentUser(ctx context.Context) (*User, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	data, err := r.Current.Load(ctx, principal)
	if err != nil {
		return nil, err
	}
	user := &User{
		ID:               data.ID,
		FirstName:        data.FirstName,
		LastName:         data.LastName,
		Email:            data.Email,
		HasPassword:      data.HasPassword,
		SupportUserHash:  data.SupportUserHash,
		OnboardingStatus: data.OnboardingStatus,
		UserVars:         data.UserVars,
		AvailableWorkspaces: &AvailableWorkspaces{
			AvailableWorkspacesForSignIn: availableWorkspacesFrom(data.AvailableForSignIn),
			AvailableWorkspacesForSignUp: availableWorkspacesFrom(data.AvailableForSignUp),
		},
	}
	if data.Workspace != nil {
		user.CurrentWorkspace = workspaceFrom(data.Workspace)
	}
	return user, nil
}

func workspaceFrom(workspace *auth.CurrentUserWorkspace) *Workspace {
	converted := &Workspace{
		ID:                                workspace.ID,
		DisplayName:                       workspace.DisplayName,
		Logo:                              workspace.Logo,
		InviteHash:                        workspace.InviteHash,
		AllowImpersonation:                workspace.AllowImpersonation,
		ActivationStatus:                  workspace.ActivationStatus,
		IsPublicInviteLinkEnabled:         workspace.IsPublicInviteLinkEnabled,
		IsCampaignClickTrackingEnabled:    workspace.IsCampaignClickTrackingEnabled,
		IsCampaignOpenTrackingEnabled:     workspace.IsCampaignOpenTrackingEnabled,
		WorkspaceDiscoverability:          workspace.WorkspaceDiscoverability,
		IsGoogleAuthEnabled:               workspace.IsGoogleAuthEnabled,
		IsPasswordAuthEnabled:             workspace.IsPasswordAuthEnabled,
		IsGoogleAuthBypassEnabled:         workspace.IsGoogleAuthBypassEnabled,
		IsPasswordAuthBypassEnabled:       workspace.IsPasswordAuthBypassEnabled,
		Subdomain:                         workspace.Subdomain,
		WorkspaceUrls:                     &WorkspaceUrls{SubdomainURL: workspace.SubdomainURL},
		WorkspaceMembersCount:             workspace.WorkspaceMembersCount,
		AiChatModelTier:                   workspace.AIChatModelTier,
		AiAgentModelTier:                  workspace.AIAgentModelTier,
		IsAutoModelSelectionEnabled:       workspace.IsAutoModelSelectionEnabled,
		AiModelIDByTier:                   workspace.AIModelIDByTier,
		AiAdditionalInstructions:          workspace.AIAdditionalInstructions,
		IsTwoFactorAuthenticationEnforced: workspace.IsTwoFactorAuthenticationEnforced,
		TrashRetentionDays:                workspace.TrashRetentionDays,
		EventLogRetentionDays:             workspace.EventLogRetentionDays,
		EditableProfileFields:             workspace.EditableProfileFields,
		IsInternalMessagesImportEnabled:   workspace.IsInternalMessagesImportEnabled,
		InstalledApplications:             make([]*Application, 0, len(workspace.InstalledApplications)),
		FeatureFlags:                      make([]*FeatureFlag, 0, len(workspace.FeatureFlags)),
	}
	if workspace.CustomApplication != nil {
		converted.WorkspaceCustomApplication = applicationFrom(*workspace.CustomApplication)
	}
	for _, application := range workspace.InstalledApplications {
		converted.InstalledApplications = append(converted.InstalledApplications, applicationFrom(application))
	}
	for _, flag := range workspace.FeatureFlags {
		converted.FeatureFlags = append(converted.FeatureFlags, &FeatureFlag{Key: flag.Key, Value: flag.Value})
	}
	if role := workspace.DefaultRole; role != nil {
		converted.DefaultRole = &Role{
			ID:                            role.ID,
			Label:                         role.Label,
			Description:                   role.Description,
			Icon:                          role.Icon,
			CanUpdateAllSettings:          role.CanUpdateAllSettings,
			CanAccessAllTools:             role.CanAccessAllTools,
			IsEditable:                    role.IsEditable,
			CanReadAllObjectRecords:       role.CanReadAllObjectRecords,
			CanUpdateAllObjectRecords:     role.CanUpdateAllObjectRecords,
			CanSoftDeleteAllObjectRecords: role.CanSoftDeleteAllObjectRecords,
			CanDestroyAllObjectRecords:    role.CanDestroyAllObjectRecords,
			CanBeAssignedToUsers:          role.CanBeAssignedToUsers,
			CanBeAssignedToAgents:         role.CanBeAssignedToAgents,
			CanBeAssignedToAPIKeys:        role.CanBeAssignedToAPIKeys,
		}
	}
	return converted
}

func applicationFrom(application auth.CurrentUserApplication) *Application {
	return &Application{
		ID:                  application.ID,
		Name:                application.Name,
		UniversalIdentifier: application.UniversalIdentifier,
		LogoURL:             application.LogoURL,
		CreatedAt:           metadata.Timestamp{Time: application.CreatedAt},
	}
}
