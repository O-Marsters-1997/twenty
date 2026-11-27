package commandmenugql

import (
	"context"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/commandmenu"
)

type LayoutsPermissions interface {
	HasLayoutsPermission(ctx context.Context, userWorkspaceID, apiKeyID string) (bool, error)
}

type Resolver struct {
	Store       *commandmenu.Store
	Permissions LayoutsPermissions
}

func (r *Resolver) writer(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return principal, auth.ErrUnauthenticated
	}
	granted, err := r.Permissions.HasLayoutsPermission(ctx, principal.UserWorkspaceID, principal.APIKeyID)
	if err != nil {
		return principal, fmt.Errorf("check layouts permission: %w", err)
	}
	if !granted {
		return principal, commandmenu.ErrPermissionDenied
	}
	return principal, nil
}

func (r *queryResolver) CommandMenuItems(ctx context.Context) ([]*commandmenu.Item, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	items, err := r.Store.List(ctx, principal.WorkspaceID, principal.UserWorkspaceID)
	if err != nil {
		return nil, err
	}
	result := make([]*commandmenu.Item, len(items))
	for i := range items {
		result[i] = &items[i]
	}
	return result, nil
}

func (r *mutationResolver) UpdateCommandMenuItem(ctx context.Context, input map[string]any) (*commandmenu.Item, error) {
	principal, err := r.writer(ctx)
	if err != nil {
		return nil, err
	}
	item, err := r.Store.Update(ctx, principal.WorkspaceID, unwrapPointers(input))
	return &item, err
}

func unwrapPointers(input map[string]any) map[string]any {
	plain := make(map[string]any, len(input))
	for key, value := range input {
		switch typed := value.(type) {
		case *string:
			plain[key] = valueOrNil(typed)
		case *float64:
			plain[key] = valueOrNil(typed)
		case *bool:
			plain[key] = valueOrNil(typed)
		default:
			plain[key] = value
		}
	}
	return plain
}

func valueOrNil[TValue any](pointer *TValue) any {
	if pointer == nil {
		return nil
	}
	return *pointer
}

func (r *mutationResolver) ResetCommandMenuItem(ctx context.Context, id string) (*commandmenu.Item, error) {
	principal, err := r.writer(ctx)
	if err != nil {
		return nil, err
	}
	item, err := r.Store.Reset(ctx, principal.WorkspaceID, id)
	return &item, err
}

func (r *itemResolver) Payload(_ context.Context, item *commandmenu.Item) (CommandMenuItemPayload, error) {
	if item.Payload == nil {
		return nil, nil
	}
	return item.Payload, nil
}

func (r *Resolver) CommandMenuItem() CommandMenuItemResolver { return &itemResolver{r} }
func (r *Resolver) Query() QueryResolver                     { return &queryResolver{r} }
func (r *Resolver) Mutation() MutationResolver               { return &mutationResolver{r} }

type itemResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
type mutationResolver struct{ *Resolver }
