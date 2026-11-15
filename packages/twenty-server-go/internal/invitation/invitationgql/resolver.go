package invitationgql

import (
	"context"
	"fmt"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
)

type Resolver struct {
	Invitations     *store.Invitations
	ApprovedDomains *store.ApprovedDomains
	Permissions     *accessstore.Permissions
}

func (r *Resolver) authorize(ctx context.Context) error {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.ErrUnauthenticated
	}
	allowed, err := r.Permissions.Has(ctx, principal, accessstore.FlagWorkspaceMembers)
	if err != nil {
		return err
	}
	if !allowed {
		return fmt.Errorf("%w: missing the %s permission", accessstore.ErrForbidden, accessstore.FlagWorkspaceMembers)
	}
	return nil
}

func (r *mutationResolver) DeleteWorkspaceInvitation(ctx context.Context, appTokenID string) (string, error) {
	if err := r.authorize(ctx); err != nil {
		return "", err
	}
	deleted, err := r.Invitations.Delete(ctx, appTokenID)
	if err != nil {
		return "", err
	}
	if !deleted {
		return "error", nil
	}
	return "success", nil
}

func (r *mutationResolver) DeleteApprovedAccessDomain(ctx context.Context, input map[string]any) (bool, error) {
	if err := r.authorize(ctx); err != nil {
		return false, err
	}
	id, _ := input["id"].(string)
	if err := r.ApprovedDomains.Delete(ctx, id); err != nil {
		return false, err
	}
	return true, nil
}

func (r *queryResolver) FindWorkspaceInvitations(ctx context.Context) ([]*store.Invitation, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	return pointers(r.Invitations.List(ctx))
}

func (r *queryResolver) GetApprovedAccessDomains(ctx context.Context) ([]*store.ApprovedDomain, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	return pointers(r.ApprovedDomains.List(ctx))
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func pointers[TValue any](values []TValue, err error) ([]*TValue, error) {
	if err != nil {
		return nil, err
	}
	listed := make([]*TValue, len(values))
	for i := range values {
		listed[i] = &values[i]
	}
	return listed, nil
}
