package messaginggql

import (
	"context"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
)

type Resolver struct {
	Channels *store.Channels
}

func caller(ctx context.Context) (string, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.UserWorkspaceID == "" {
		return "", fmt.Errorf("%w: a workspace member session is required", store.ErrForbidden)
	}
	return principal.UserWorkspaceID, nil
}

func pointer[TRecord any](record TRecord, err error) (*TRecord, error) {
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func pointers[TRecord any](records []TRecord, err error) ([]*TRecord, error) {
	if err != nil {
		return nil, err
	}
	listed := make([]*TRecord, len(records))
	for i := range records {
		listed[i] = &records[i]
	}
	return listed, nil
}

func (r *messageChannelResolver) ConnectedAccount(ctx context.Context, channel *store.MessageChannel) (*store.Account, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	return r.Channels.MessageChannelAccount(ctx, *channel, principal.UserWorkspaceID)
}

func (r *mutationResolver) DeleteConnectedAccount(ctx context.Context, id string) (*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DeleteAccount(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) DisconnectConnectedAccount(ctx context.Context, id string) (*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DisconnectAccount(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) UpdateMessageChannel(ctx context.Context, input map[string]any) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	id, update := idAndUpdate(input)
	return pointer(r.Channels.UpdateMessageChannel(ctx, id, userWorkspaceID, update))
}

func (r *mutationResolver) CreateEmailGroupChannel(ctx context.Context, input map[string]any) (*store.EmailGroupChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	handle, _ := input["handle"].(string)
	var displayName *string
	if text, ok := input["displayName"].(string); ok {
		displayName = &text
	}
	return pointer(r.Channels.CreateEmailGroupChannel(ctx, userWorkspaceID, handle, displayName))
}

func (r *mutationResolver) UpdateEmailGroupChannel(ctx context.Context, input map[string]any) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	input = withoutPointers(input)
	id, _ := input["id"].(string)
	return pointer(r.Channels.UpdateEmailGroupChannel(ctx, id, userWorkspaceID, input))
}

func (r *mutationResolver) DeleteEmailGroupChannel(ctx context.Context, id string) (*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.Channels.DeleteEmailGroupChannel(ctx, id, userWorkspaceID))
}

func (r *mutationResolver) UpdateCalendarChannel(ctx context.Context, input map[string]any) (*store.CalendarChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	id, update := idAndUpdate(input)
	return pointer(r.Channels.UpdateCalendarChannel(ctx, id, userWorkspaceID, update))
}

func (r *queryResolver) MyConnectedAccounts(ctx context.Context) ([]*store.Account, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.Accounts(ctx, userWorkspaceID))
}

func (r *queryResolver) ApplicationConnectedAccounts(ctx context.Context, applicationID string) ([]*store.ApplicationAccount, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.ApplicationAccounts(ctx, applicationID, userWorkspaceID))
}

func (r *queryResolver) MyMessageChannels(ctx context.Context, connectedAccountID *string) ([]*store.MessageChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.MessageChannels(ctx, userWorkspaceID, connectedAccountID))
}

func (r *queryResolver) MyCalendarChannels(ctx context.Context, connectedAccountID *string) ([]*store.CalendarChannel, error) {
	userWorkspaceID, err := caller(ctx)
	if err != nil {
		return nil, err
	}
	return pointers(r.Channels.CalendarChannels(ctx, userWorkspaceID, connectedAccountID))
}

func idAndUpdate(input map[string]any) (string, map[string]any) {
	input = withoutPointers(input)
	id, _ := input["id"].(string)
	update, _ := input["update"].(map[string]any)
	return id, update
}

func withoutPointers(input map[string]any) map[string]any {
	plain := make(map[string]any, len(input))
	for key, value := range input {
		switch typed := value.(type) {
		case *string:
			if typed != nil {
				plain[key] = *typed
			} else {
				plain[key] = nil
			}
		case *bool:
			if typed != nil {
				plain[key] = *typed
			} else {
				plain[key] = nil
			}
		case map[string]any:
			plain[key] = withoutPointers(typed)
		default:
			plain[key] = value
		}
	}
	return plain
}

func (r *Resolver) MessageChannel() MessageChannelResolver { return &messageChannelResolver{r} }

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	messageChannelResolver struct{ *Resolver }
	mutationResolver       struct{ *Resolver }
	queryResolver          struct{ *Resolver }
)
