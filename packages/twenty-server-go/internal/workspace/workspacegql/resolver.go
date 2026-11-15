package workspacegql

import (
	"context"
	"fmt"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/store"
)

const flagSecurity = "SECURITY"

type Resolver struct {
	Workspaces  *store.Workspaces
	Permissions *accessstore.Permissions
}

func (r *Resolver) principal(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

func (r *mutationResolver) UpdateWorkspace(ctx context.Context, data map[string]any) (*store.Workspace, error) {
	principal, err := r.principal(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := r.Workspaces.Update(ctx, data, func(ctx context.Context, flag string) (bool, error) {
		return r.Permissions.Has(ctx, principal, flag)
	})
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *mutationResolver) UpdateWorkspaceAllowedIframeOrigins(ctx context.Context, data map[string]any) (*store.Workspace, error) {
	principal, err := r.principal(ctx)
	if err != nil {
		return nil, err
	}
	allowed, err := r.Permissions.Has(ctx, principal, flagSecurity)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, fmt.Errorf("%w: missing the %s permission", store.ErrForbidden, flagSecurity)
	}
	operation, _ := data["operation"].(string)
	origin, _ := data["origin"].(string)
	updated, err := r.Workspaces.UpdateAllowedIframeOrigins(ctx, operation, origin)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *workspaceResolver) DefaultRole(ctx context.Context, obj *store.Workspace) (*accessstore.Role, error) {
	if obj.DefaultRoleID == nil {
		return nil, nil
	}
	role, err := r.Permissions.Role(ctx, *obj.DefaultRoleID)
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Workspace() WorkspaceResolver { return &workspaceResolver{r} }

type (
	mutationResolver  struct{ *Resolver }
	workspaceResolver struct{ *Resolver }
)
