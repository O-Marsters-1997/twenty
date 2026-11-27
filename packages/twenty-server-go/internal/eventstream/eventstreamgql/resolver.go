package eventstreamgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/eventstream"
)

type Resolver struct {
	Hub *eventstream.Hub
}

func (r *mutationResolver) AddQueryToEventStream(ctx context.Context, input map[string]any) (bool, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return false, auth.ErrUnauthenticated
	}
	signature, _ := input["operationSignature"].(map[string]any)
	return r.Hub.AddQuery(principal.WorkspaceID, input["eventStreamId"].(string), eventstream.OwnerOf(principal), input["queryId"].(string), signature)
}

func (r *mutationResolver) RemoveQueryFromEventStream(ctx context.Context, input map[string]any) (bool, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return false, auth.ErrUnauthenticated
	}
	return r.Hub.RemoveQuery(principal.WorkspaceID, input["eventStreamId"].(string), eventstream.OwnerOf(principal), input["queryId"].(string))
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

type mutationResolver struct{ *Resolver }
