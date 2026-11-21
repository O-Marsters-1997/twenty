package invitationgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	Store *store.Store
}

// workspaceID returns the caller's workspace once the caller may manage members.
func (r *Resolver) workspaceID(ctx context.Context) (string, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return "", auth.ErrUnauthenticated
	}
	if err := r.Store.AuthorizeMembers(ctx, principal.WorkspaceID, principal.UserWorkspaceID); err != nil {
		return "", err
	}
	return principal.WorkspaceID, nil
}

func (r *mutationResolver) DeleteWorkspaceInvitation(ctx context.Context, appTokenID string) (string, error) {
	workspaceID, err := r.workspaceID(ctx)
	if err != nil {
		return "", err
	}
	deleted, err := r.Store.DeleteInvitation(ctx, workspaceID, appTokenID)
	if err != nil {
		return "", err
	}
	if !deleted {
		return "error", nil
	}
	return "success", nil
}

func (r *mutationResolver) DeleteApprovedAccessDomain(ctx context.Context, input DeleteApprovedAccessDomainInput) (bool, error) {
	workspaceID, err := r.workspaceID(ctx)
	if err != nil {
		return false, err
	}
	if err := r.Store.DeleteApprovedDomain(ctx, workspaceID, input.ID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *queryResolver) FindWorkspaceInvitations(ctx context.Context) ([]*WorkspaceInvitation, error) {
	workspaceID, err := r.workspaceID(ctx)
	if err != nil {
		return nil, err
	}
	invitations, err := r.Store.Invitations(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	result := make([]*WorkspaceInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		result = append(result, &WorkspaceInvitation{
			ID:        invitation.ID,
			Email:     invitation.Email,
			RoleID:    invitation.RoleID,
			ExpiresAt: metadata.Timestamp{Time: invitation.ExpiresAt},
		})
	}
	return result, nil
}

func (r *queryResolver) GetApprovedAccessDomains(ctx context.Context) ([]*ApprovedAccessDomain, error) {
	workspaceID, err := r.workspaceID(ctx)
	if err != nil {
		return nil, err
	}
	domains, err := r.Store.ApprovedDomains(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	result := make([]*ApprovedAccessDomain, 0, len(domains))
	for _, domain := range domains {
		result = append(result, &ApprovedAccessDomain{
			ID:          domain.ID,
			Domain:      domain.Domain,
			IsValidated: domain.IsValidated,
			CreatedAt:   metadata.Timestamp{Time: domain.CreatedAt},
		})
	}
	return result, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
