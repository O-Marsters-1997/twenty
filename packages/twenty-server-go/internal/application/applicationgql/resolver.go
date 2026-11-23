package applicationgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type Resolver struct {
	Store *store.Store
}

func (r *queryResolver) FindManyApplications(ctx context.Context) ([]*store.Application, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	if err := r.Store.AuthorizeApplications(ctx, principal); err != nil {
		return nil, err
	}
	return r.Store.Applications(ctx, principal.WorkspaceID)
}

func (r *queryResolver) TimelineActivityTypes(ctx context.Context) ([]*store.TimelineActivityType, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	return r.Store.TimelineActivityTypes(ctx, principal.WorkspaceID)
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type queryResolver struct{ *Resolver }
