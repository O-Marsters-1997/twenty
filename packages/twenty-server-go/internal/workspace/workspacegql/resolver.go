package workspacegql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type Resolver struct {
	Workspaces *auth.PublicWorkspaces
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type queryResolver struct{ *Resolver }

func (r *queryResolver) CheckUserExists(ctx context.Context, email string, _ *string) (*CheckUserExist, error) {
	found, err := r.Workspaces.UserExists(ctx, email)
	if err != nil {
		return nil, err
	}
	return &CheckUserExist{Exists: found.Exists, AvailableWorkspacesCount: found.AvailableWorkspacesCount, IsEmailVerified: found.IsEmailVerified}, nil
}

func (r *queryResolver) FindWorkspaceFromInviteHash(ctx context.Context, inviteHash string) (*Workspace, error) {
	found, err := r.Workspaces.ByInviteHash(ctx, inviteHash)
	if err != nil {
		return nil, err
	}
	return &Workspace{ID: found.ID, DisplayName: found.DisplayName, Logo: found.Logo, AllowImpersonation: found.AllowImpersonation}, nil
}

func (r *queryResolver) CheckWorkspaceSubdomainAvailability(ctx context.Context, subdomain string) (*SubdomainAvailability, error) {
	if _, err := principalFrom(ctx); err != nil {
		return nil, err
	}
	found, err := r.Workspaces.SubdomainAvailability(ctx, subdomain)
	if err != nil {
		return nil, err
	}
	return &SubdomainAvailability{
		IsValid: found.IsValid, Available: found.Available, SuggestedSubdomain: found.SuggestedSubdomain, SuggestedSubdomains: found.SuggestedSubdomains,
	}, nil
}

func (r *queryResolver) GetWorkspaceCreationDefaults(ctx context.Context) (*WorkspaceCreationDefaults, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	found, err := r.Workspaces.CreationDefaults(ctx, principal.UserID)
	if err != nil {
		return nil, err
	}
	return &WorkspaceCreationDefaults{DisplayName: found.DisplayName, Subdomain: found.Subdomain}, nil
}

func (r *queryResolver) GetPublicWorkspaceDataByDomain(ctx context.Context, origin string) (*PublicWorkspaceData, error) {
	found, err := r.Workspaces.ByOrigin(ctx, origin)
	if err != nil {
		return nil, err
	}
	return &PublicWorkspaceData{
		ID:                  found.ID,
		Logo:                &found.Logo,
		DisplayName:         found.DisplayName,
		WorkspaceUrls:       &WorkspaceUrls{SubdomainURL: found.SubdomainURL},
		AuthProviders:       &AuthProviders{Google: found.AuthProviders.Google, MagicLink: found.AuthProviders.MagicLink, Password: found.AuthProviders.Password},
		AuthBypassProviders: &AuthBypassProviders{Google: found.AuthBypassProviders.Google, Password: found.AuthBypassProviders.Password},
	}, nil
}

func (r *queryResolver) GetPublicWorkspaceDataByID(ctx context.Context, id string) (*PublicWorkspaceDataSummary, error) {
	found, err := r.Workspaces.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &PublicWorkspaceDataSummary{ID: found.ID, Logo: &found.Logo, DisplayName: found.DisplayName}, nil
}

func (r *queryResolver) CurrentWorkspace(ctx context.Context) (*Workspace, error) {
	principal, err := principalFrom(ctx)
	if err != nil {
		return nil, err
	}
	origins, err := r.Workspaces.AllowedIframeOrigins(ctx, principal.WorkspaceID)
	if err != nil {
		return nil, err
	}
	return &Workspace{ID: principal.WorkspaceID, AllowedIframeOrigins: origins}, nil
}

func principalFrom(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}
