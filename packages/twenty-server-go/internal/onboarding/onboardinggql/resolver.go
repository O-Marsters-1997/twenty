package onboardinggql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding"
)

type Resolver struct {
	Store *onboarding.Store
}

func caller(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.UserID == "" || principal.WorkspaceID == "" {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

func (r *mutationResolver) SkipSyncEmailOnboardingStep(ctx context.Context, isAutoSkipped bool) (*OnboardingStepSuccess, error) {
	principal, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	if err := r.Store.Skip(ctx, principal.UserID, principal.WorkspaceID, isAutoSkipped); err != nil {
		return nil, err
	}
	return &OnboardingStepSuccess{Success: true}, nil
}

func (r *mutationResolver) GoBackToPreviousOnboardingStep(ctx context.Context) (*onboarding.Navigation, error) {
	principal, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	navigation, err := r.Store.GoBack(ctx, principal.UserID, principal.WorkspaceID)
	if err != nil {
		return nil, err
	}
	return &navigation, nil
}

func (r *queryResolver) Empty(context.Context) (*bool, error) { return nil, nil }

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
