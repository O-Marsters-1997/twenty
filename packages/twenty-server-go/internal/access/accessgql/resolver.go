package accessgql

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	playgroundTokenTTL = 2 * time.Hour
	apiKeyTokenMaximum = 100 * 365 * 24 * time.Hour
)

type TokenIssuer interface {
	IssueAPIKey(ctx context.Context, workspaceID, apiKeyID string, expiresAt time.Time) (string, error)
	IssuePlayground(ctx context.Context, principal auth.Principal, ttl time.Duration) (string, time.Time, error)
}

type Resolver struct {
	WebhookStore *store.Webhooks
	APIKeyStore  *store.APIKeys
	Tokens       TokenIssuer
}

func (r *apiKeyResolver) Role(ctx context.Context, obj *store.APIKey) (*store.Role, error) {
	return pointer(r.APIKeyStore.RoleOf(ctx, obj.ID))
}

func (r *mutationResolver) CreateWebhook(ctx context.Context, input map[string]any) (*store.Webhook, error) {
	return pointer(r.WebhookStore.Create(ctx, input))
}

func (r *mutationResolver) UpdateWebhook(ctx context.Context, input map[string]any) (*store.Webhook, error) {
	id, _ := input["id"].(string)
	updates, _ := input["update"].(map[string]any)
	return pointer(r.WebhookStore.Update(ctx, id, updates))
}

func (r *mutationResolver) DeleteWebhook(ctx context.Context, id string) (*store.Webhook, error) {
	return pointer(r.WebhookStore.Delete(ctx, id))
}

func (r *mutationResolver) CreateAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	return pointer(r.APIKeyStore.Create(ctx, input))
}

func (r *mutationResolver) UpdateAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	id, _ := input["id"].(string)
	delete(input, "id")
	return nullable(r.APIKeyStore.Update(ctx, id, input))
}

func (r *mutationResolver) RevokeAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	id, _ := input["id"].(string)
	return nullable(r.APIKeyStore.Revoke(ctx, id))
}

func (r *mutationResolver) AssignRoleToAPIKey(ctx context.Context, apiKeyID string, roleID string) (bool, error) {
	if err := r.APIKeyStore.AssignRole(ctx, apiKeyID, roleID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) GenerateAPIKeyToken(ctx context.Context, apiKeyID string, expiresAt string) (*store.Token, error) {
	if _, err := r.APIKeyStore.Validate(ctx, apiKeyID); err != nil {
		return nil, err
	}
	expiry := time.Now().Add(apiKeyTokenMaximum)
	if expiresAt != "" {
		parsed, err := time.Parse(time.RFC3339Nano, expiresAt)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid expiresAt", metadata.ErrInvalidInput)
		}
		expiry = parsed
	}
	token, err := r.Tokens.IssueAPIKey(ctx, workspace.PinnedWorkspaceID, apiKeyID, expiry)
	if err != nil {
		return nil, err
	}
	return &store.Token{Token: token}, nil
}

func (r *mutationResolver) GeneratePlaygroundToken(ctx context.Context) (*store.Token, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	token, expiresAt, err := r.Tokens.IssuePlayground(ctx, principal, playgroundTokenTTL)
	if err != nil {
		return nil, err
	}
	return &store.Token{Token: token, ExpiresAt: expiresAt.UTC().Format("2006-01-02T15:04:05.000Z")}, nil
}

func (r *queryResolver) Webhooks(ctx context.Context) ([]*store.Webhook, error) {
	return pointers(r.WebhookStore.List(ctx))
}

func (r *queryResolver) Webhook(ctx context.Context, id string) (*store.Webhook, error) {
	return nullable(r.WebhookStore.Get(ctx, id))
}

func (r *queryResolver) APIKeys(ctx context.Context) ([]*store.APIKey, error) {
	return pointers(r.APIKeyStore.List(ctx))
}

func (r *queryResolver) APIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	id, _ := input["id"].(string)
	return nullable(r.APIKeyStore.Get(ctx, id))
}

func (r *queryResolver) GetAPIKeyRoles(ctx context.Context) ([]*store.Role, error) {
	return pointers(r.APIKeyStore.AssignableRoles(ctx))
}

func (r *Resolver) ApiKey() ApiKeyResolver { return &apiKeyResolver{r} }

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	apiKeyResolver   struct{ *Resolver }
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func pointer[TValue any](value TValue, err error) (*TValue, error) {
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func nullable[TValue any](value TValue, err error) (*TValue, error) {
	if errors.Is(err, metadata.ErrNotFound) {
		return nil, nil
	}
	return pointer(value, err)
}

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
