package workspacegql

import (
	"context"
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type Resolver struct {
	Settings    *workspace.Settings
	Removal     *workspace.Removal
	Permissions PermissionChecker
	System      workspace.SettingsConfig
	LogoURL     func(ctx context.Context, workspaceID, fileID string) (string, error)
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

type PermissionChecker interface {
	Has(ctx context.Context, principal auth.Principal, flag string) (bool, error)
}

func (r *Resolver) require(ctx context.Context, principal auth.Principal, flag string) error {
	allowed, err := r.Permissions.Has(ctx, principal, flag)
	if err != nil {
		return err
	}
	if !allowed {
		return workspace.ErrPermissionDenied
	}
	return nil
}

func userSession(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	if principal.UserID == "" || principal.APIKeyID != "" {
		return auth.Principal{}, workspace.ErrPermissionDenied
	}
	return principal, nil
}

func (r *mutationResolver) DeleteCurrentWorkspace(ctx context.Context) (*workspace.Workspace, error) {
	principal, err := callerWorkspace(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.require(ctx, principal, "WORKSPACE"); err != nil {
		return nil, err
	}
	return pointer(r.Removal.DeleteWorkspace(ctx, principal.WorkspaceID))
}

func (r *mutationResolver) DeleteUserFromWorkspace(ctx context.Context, workspaceMemberIdToDelete string) (*workspace.Identity, error) {
	principal, err := callerWorkspace(ctx)
	if err != nil {
		return nil, err
	}
	if principal.UserID == "" || principal.APIKeyID != "" {
		return nil, workspace.ErrPermissionDenied
	}
	userID, err := r.Removal.MemberUserID(ctx, workspaceMemberIdToDelete)
	if err != nil {
		return nil, err
	}
	if userID != principal.UserID {
		if err := r.require(ctx, principal, "WORKSPACE_MEMBERS"); err != nil {
			if errors.Is(err, workspace.ErrPermissionDenied) {
				return nil, workspace.ErrMemberPermissionDenied
			}
			return nil, err
		}
	}
	removed, err := r.Removal.RemoveUser(ctx, principal.WorkspaceID, userID, principal.UserWorkspaceID)
	if err != nil {
		return nil, err
	}
	return &workspace.Identity{ID: removed}, nil
}

func (r *mutationResolver) DeleteUser(ctx context.Context) (*workspace.Identity, error) {
	principal, err := userSession(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.Removal.DeleteAccount(ctx, principal.UserID); err != nil {
		return nil, err
	}
	return &workspace.Identity{ID: principal.UserID}, nil
}
