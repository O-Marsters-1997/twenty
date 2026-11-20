package workspacegql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Resolver struct {
	Settings *workspace.Settings
	System   workspace.SettingsConfig
	LogoURL  func(ctx context.Context, workspaceID, fileID string) (string, error)
}

func callerWorkspace(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.WorkspaceID == "" {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

func pointer(record workspace.Workspace, err error) (*workspace.Workspace, error) {
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *mutationResolver) UpdateWorkspace(ctx context.Context, data map[string]any) (*workspace.Workspace, error) {
	principal, err := callerWorkspace(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Settings.Update(ctx, principal.WorkspaceID, data))
}

func (r *mutationResolver) UpdateWorkspaceAllowedIframeOrigins(ctx context.Context, data UpdateWorkspaceAllowedIframeOriginsInput) (*workspace.Workspace, error) {
	principal, err := callerWorkspace(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Settings.UpdateAllowedIframeOrigins(ctx, principal.WorkspaceID, data.Operation, data.Origin))
}

func (r *mutationResolver) ActivateWorkspace(ctx context.Context, _ ActivateWorkspaceInput) (*workspace.Workspace, error) {
	principal, err := callerWorkspace(ctx)
	if err != nil {
		return nil, err
	}
	if principal.UserID == "" {
		return nil, auth.ErrUnauthenticated
	}
	return pointer(r.Settings.Activate(ctx, principal.WorkspaceID))
}

func (r *queryResolver) Empty(context.Context) (*bool, error) {
	return nil, nil
}

func (r *workspaceResolver) Logo(ctx context.Context, obj *workspace.Workspace) (string, error) {
	if obj.LogoFileID == nil {
		return "", nil
	}
	return r.LogoURL(ctx, obj.ID, *obj.LogoFileID)
}

func (r *workspaceResolver) IsGoogleAuthEnabled(_ context.Context, obj *workspace.Workspace) (bool, error) {
	return obj.IsGoogleAuthEnabled && r.System.GoogleAuthEnabled, nil
}

func (r *workspaceResolver) IsPasswordAuthEnabled(_ context.Context, obj *workspace.Workspace) (bool, error) {
	return obj.IsPasswordAuthEnabled && r.System.PasswordAuthEnabled, nil
}

func (r *workspaceResolver) DefaultRole(ctx context.Context, obj *workspace.Workspace) (*workspace.Role, error) {
	if obj.DefaultRoleID == nil {
		return nil, nil
	}
	return r.Settings.Role(ctx, *obj.DefaultRoleID, obj.ID)
}

func (r *Resolver) Mutation() MutationResolver   { return &mutationResolver{r} }
func (r *Resolver) Query() QueryResolver         { return &queryResolver{r} }
func (r *Resolver) Workspace() WorkspaceResolver { return &workspaceResolver{r} }

type (
	mutationResolver  struct{ *Resolver }
	queryResolver     struct{ *Resolver }
	workspaceResolver struct{ *Resolver }
)
