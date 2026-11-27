package invitationgql

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

const validationTokenTTL = 24 * time.Hour

type DomainTokens interface {
	IssueApprovedAccessDomainToken(ctx context.Context, email, workspaceID string, ttl time.Duration) (string, error)
	VerifyApprovedAccessDomainToken(ctx context.Context, token string) (auth.ApprovedAccessDomainClaims, error)
}

type Resolver struct {
	Store    *store.Store
	Inviter  *store.Inviter
	Tokens   DomainTokens
	Sender   systemmail.Sender
	FrontURL *url.URL
}

// workspaceID returns the caller's workspace once the caller may manage members.
func (r *Resolver) workspaceID(ctx context.Context) (string, error) {
	principal, err := r.principal(ctx)
	return principal.WorkspaceID, err
}

func (r *Resolver) principal(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	if err := r.Store.AuthorizeMembers(ctx, principal.WorkspaceID, principal.UserWorkspaceID); err != nil {
		return auth.Principal{}, err
	}
	return principal, nil
}

func (r *mutationResolver) SendInvitations(ctx context.Context, emails []string, roleID *string) (*SendInvitations, error) {
	principal, err := r.principal(ctx)
	if err != nil {
		return nil, err
	}
	if roleID != nil {
		if err := r.Store.AuthorizeRoles(ctx, principal.WorkspaceID, principal.UserWorkspaceID); err != nil {
			return nil, err
		}
	}
	result, err := r.Inviter.Send(ctx, principal.WorkspaceID, principal.UserID, roleID, emails)
	if err != nil {
		return nil, err
	}
	return sendInvitations(result), nil
}

func (r *mutationResolver) ResendWorkspaceInvitation(ctx context.Context, appTokenID string) (*SendInvitations, error) {
	principal, err := r.principal(ctx)
	if err != nil {
		return nil, err
	}
	result, err := r.Inviter.Resend(ctx, principal.WorkspaceID, principal.UserID, appTokenID)
	if err != nil {
		return nil, err
	}
	return sendInvitations(result), nil
}

func sendInvitations(result store.SendResult) *SendInvitations {
	invitations := make([]*WorkspaceInvitation, 0, len(result.Invitations))
	for _, invitation := range result.Invitations {
		invitations = append(invitations, &WorkspaceInvitation{
			ID:        invitation.ID,
			Email:     invitation.Email,
			RoleID:    invitation.RoleID,
			ExpiresAt: metadata.Timestamp{Time: invitation.ExpiresAt},
		})
	}
	return &SendInvitations{Success: result.Success, Errors: result.Errors, Result: invitations}
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

func (r *mutationResolver) CreateApprovedAccessDomain(ctx context.Context, input CreateApprovedAccessDomainInput) (*ApprovedAccessDomain, error) {
	workspaceID, err := r.workspaceID(ctx)
	if err != nil {
		return nil, err
	}
	domain, err := r.Store.CreateApprovedDomain(ctx, workspaceID, input.Domain, input.Email)
	if err != nil {
		return nil, err
	}
	token, err := r.Tokens.IssueApprovedAccessDomainToken(ctx, input.Email, workspaceID, validationTokenTTL)
	if err != nil {
		return nil, err
	}
	link := r.FrontURL.JoinPath("settings", "security")
	link.RawQuery = url.Values{"wtdId": {domain.ID}, "validationToken": {token}}.Encode()
	message, err := systemmail.ApprovedAccessDomainEmail(input.Email, link.String(), domain.Domain)
	if err != nil {
		return nil, err
	}
	if err := r.Sender.Send(ctx, message); err != nil {
		return nil, fmt.Errorf("send approved access domain validation: %w", err)
	}
	return toApprovedAccessDomain(domain), nil
}

func (r *mutationResolver) ValidateApprovedAccessDomain(ctx context.Context, input ValidateApprovedAccessDomainInput) (*ApprovedAccessDomain, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	claims, err := r.Tokens.VerifyApprovedAccessDomainToken(ctx, input.ValidationToken)
	if err != nil {
		return nil, err
	}
	if claims.WorkspaceID != principal.WorkspaceID {
		return nil, auth.ErrInvalidApprovedAccessDomainToken
	}
	domain, err := r.Store.ValidateApprovedDomain(ctx, principal.WorkspaceID, input.ApprovedAccessDomainID, claims.Email)
	if err != nil {
		return nil, err
	}
	return toApprovedAccessDomain(domain), nil
}

func toApprovedAccessDomain(domain store.ApprovedDomain) *ApprovedAccessDomain {
	return &ApprovedAccessDomain{
		ID:          domain.ID,
		Domain:      domain.Domain,
		IsValidated: domain.IsValidated,
		CreatedAt:   metadata.Timestamp{Time: domain.CreatedAt},
	}
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
		result = append(result, toApprovedAccessDomain(domain))
	}
	return result, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
