package applicationgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func (r *mutationResolver) UpdateTimelineActivityType(ctx context.Context, input map[string]any) (*store.TimelineActivityType, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	id, _ := input["id"].(string)
	var isActive *bool
	switch value := input["isActive"].(type) {
	case bool:
		isActive = &value
	case *bool:
		isActive = value
	}
	return pointer(r.TimelineTypes.SetActive(ctx, id, isActive))
}

func (r *mutationResolver) ResetTimelineActivityType(ctx context.Context, id string) (*store.TimelineActivityType, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	return pointer(r.TimelineTypes.Reset(ctx, id))
}

func (r *queryResolver) FindManyApplications(ctx context.Context) ([]*store.Application, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	applications, err := r.Applications.List(ctx)
	if err != nil {
		return nil, err
	}
	listed := make([]*store.Application, len(applications))
	for i := range applications {
		listed[i] = &applications[i]
	}
	return listed, nil
}

func (r *queryResolver) FindOneApplication(ctx context.Context, id *string, universalIdentifier *string) (*store.Application, error) {
	if err := r.authorize(ctx); err != nil {
		return nil, err
	}
	return pointer(r.Applications.Get(ctx, deref(id), deref(universalIdentifier)))
}

func (r *queryResolver) TimelineActivityTypes(ctx context.Context) ([]*store.TimelineActivityType, error) {
	if _, ok := auth.PrincipalFrom(ctx); !ok {
		return nil, auth.ErrUnauthenticated
	}
	types, err := r.TimelineTypes.List(ctx)
	if err != nil {
		return nil, err
	}
	listed := make([]*store.TimelineActivityType, len(types))
	for i := range types {
		listed[i] = &types[i]
	}
	return listed, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
