package usergql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/user"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Resolver struct {
	Users        *user.Store
	Applications *store.Store
	Settings     *workspace.Settings
}

func (r *queryResolver) CurrentUser(ctx context.Context) (*user.User, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.UserID == "" {
		return nil, auth.ErrUnauthenticated
	}
	found, err := r.Users.User(ctx, principal.UserID)
	if err != nil {
		return nil, err
	}
	return &found, nil
}

func (r *userResolver) SupportUserHash(_ context.Context, obj *user.User) (*string, error) {
	return r.Users.SupportUserHash(obj.Email), nil
}

func (r *userResolver) OnboardingStatus(ctx context.Context, obj *user.User) (*string, error) {
	current, err := r.currentWorkspace(ctx)
	if err != nil || current == nil {
		return nil, err
	}
	status, err := r.Users.OnboardingStatus(ctx, obj.ID, current)
	if err != nil {
		return nil, err
	}
	return &status, nil
}

func (r *userResolver) CurrentWorkspace(ctx context.Context, _ *user.User) (*user.Workspace, error) {
	return r.currentWorkspace(ctx)
}

func (r *userResolver) AvailableWorkspaces(ctx context.Context, obj *user.User) (*AvailableWorkspaces, error) {
	forSignIn, forSignUp, err := r.Users.AvailableWorkspaces(ctx, obj.ID)
	if err != nil {
		return nil, err
	}
	return &AvailableWorkspaces{
		AvailableWorkspacesForSignIn: availableWorkspacesFrom(forSignIn),
		AvailableWorkspacesForSignUp: availableWorkspacesFrom(forSignUp),
	}, nil
}

func (r *userResolver) UserVars(ctx context.Context, obj *user.User) (map[string]any, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	if principal.WorkspaceID == "" {
		return nil, nil
	}
	return r.Users.UserVars(ctx, obj.ID, principal.WorkspaceID)
}

func (r *userResolver) currentWorkspace(ctx context.Context) (*user.Workspace, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	if principal.WorkspaceID == "" {
		return nil, nil
	}
	return r.Users.Workspace(ctx, principal.WorkspaceID)
}

func (r *workspaceResolver) Logo(ctx context.Context, obj *user.Workspace) (*string, error) {
	if obj.LogoFileID == nil {
		return obj.LegacyLogo, nil
	}
	logo, err := r.Users.LogoURL(ctx, obj.ID, *obj.LogoFileID)
	if err != nil {
		return nil, err
	}
	return &logo, nil
}

func (r *workspaceResolver) WorkspaceCustomApplication(ctx context.Context, obj *user.Workspace) (*store.Application, error) {
	applications, err := r.Applications.Applications(ctx, obj.ID)
	if err != nil {
		return nil, err
	}
	for _, application := range applications {
		if application.ID == obj.WorkspaceCustomApplicationID {
			return application, nil
		}
	}
	return nil, nil
}

func (r *workspaceResolver) InstalledApplications(ctx context.Context, obj *user.Workspace) ([]*store.Application, error) {
	return r.Applications.Applications(ctx, obj.ID)
}

func (r *workspaceResolver) WorkspaceUrls(_ context.Context, obj *user.Workspace) (*WorkspaceUrls, error) {
	return &WorkspaceUrls{SubdomainURL: r.Users.WorkspaceURL(obj.Subdomain)}, nil
}

func (r *workspaceResolver) FeatureFlags(ctx context.Context, obj *user.Workspace) ([]*user.FeatureFlag, error) {
	return r.Users.FeatureFlags(ctx, obj.ID)
}

func (r *workspaceResolver) WorkspaceMembersCount(ctx context.Context, obj *user.Workspace) (*float64, error) {
	count, err := r.Users.MembersCount(ctx, obj.ID)
	if err != nil {
		return nil, err
	}
	return &count, nil
}

func (r *workspaceResolver) DefaultRole(ctx context.Context, obj *user.Workspace) (*workspace.Role, error) {
	if obj.DefaultRoleID == nil {
		return nil, nil
	}
	return r.Settings.Role(ctx, *obj.DefaultRoleID, obj.ID)
}

func availableWorkspacesFrom(workspaces []auth.AvailableWorkspace) []*AvailableWorkspace {
	converted := make([]*AvailableWorkspace, 0, len(workspaces))
	for _, available := range workspaces {
		logo := available.Logo
		converted = append(converted, &AvailableWorkspace{
			ID:                  available.ID,
			DisplayName:         available.DisplayName,
			LoginToken:          available.LoginToken,
			PersonalInviteToken: available.PersonalInviteToken,
			WorkspaceUrls:       &WorkspaceUrls{SubdomainURL: available.SubdomainURL},
			Logo:                &logo,
		})
	}
	return converted
}

func (r *Resolver) Query() QueryResolver         { return &queryResolver{r} }
func (r *Resolver) User() UserResolver           { return &userResolver{r} }
func (r *Resolver) Workspace() WorkspaceResolver { return &workspaceResolver{r} }

type (
	queryResolver     struct{ *Resolver }
	userResolver      struct{ *Resolver }
	workspaceResolver struct{ *Resolver }
)
