package accessgql

import (
	"context"
	"errors"
	"fmt"
	"maps"
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
	Permissions  *store.Permissions
	Tokens       TokenIssuer
}

func (r *Resolver) authorize(ctx context.Context, userSessionOnly bool, flags ...string) error {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.ErrUnauthenticated
	}
	if userSessionOnly && (principal.APIKeyID != "" || principal.Playground || principal.UserWorkspaceID == "") {
		return fmt.Errorf("%w: this operation needs a standard user session", store.ErrForbidden)
	}
	for _, flag := range flags {
		allowed, err := r.Permissions.Has(ctx, principal, flag)
		if err != nil {
			return err
		}
		if !allowed {
			return fmt.Errorf("%w: missing the %s permission", store.ErrForbidden, flag)
		}
	}
	return nil
}

func (r *apiKeyResolver) Role(ctx context.Context, obj *store.APIKey) (*store.Role, error) {
	return pointer(r.APIKeyStore.RoleOf(ctx, obj.ID))
}

func (r *mutationResolver) CreateWebhook(ctx context.Context, input map[string]any) (*store.Webhook, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	return pointer(r.WebhookStore.Create(ctx, input))
}

func (r *mutationResolver) UpdateWebhook(ctx context.Context, input map[string]any) (*store.Webhook, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	id, _ := input["id"].(string)
	updates, _ := input["update"].(map[string]any)
	return pointer(r.WebhookStore.Update(ctx, id, updates))
}

func (r *mutationResolver) DeleteWebhook(ctx context.Context, id string) (*store.Webhook, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	return pointer(r.WebhookStore.Delete(ctx, id))
}

func (r *mutationResolver) CreateAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointer(r.APIKeyStore.Create(ctx, input))
}

func (r *mutationResolver) UpdateAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	id, _ := input["id"].(string)
	updates := maps.Clone(input)
	delete(updates, "id")
	return nullable(r.APIKeyStore.Update(ctx, id, updates))
}

func (r *mutationResolver) RevokeAPIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	id, _ := input["id"].(string)
	return nullable(r.APIKeyStore.Revoke(ctx, id))
}

func (r *mutationResolver) AssignRoleToAPIKey(ctx context.Context, apiKeyID string, roleID string) (bool, error) {
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks, store.FlagRoles); err != nil {
		return false, err
	}
	if err := r.APIKeyStore.AssignRole(ctx, apiKeyID, roleID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) GenerateAPIKeyToken(ctx context.Context, apiKeyID string, expiresAt string) (*store.Token, error) {
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	if _, err := r.APIKeyStore.Validate(ctx, apiKeyID); err != nil {
		return nil, err
	}
	expiry := time.Now().Add(apiKeyTokenMaximum)
	if expiresAt != "" {
		parsed, err := time.Parse(time.RFC3339Nano, expiresAt)
		if err != nil || !parsed.After(time.Now()) {
			return nil, fmt.Errorf("%w: expiresAt must be a future timestamp", metadata.ErrInvalidInput)
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
	if err := r.authorize(ctx, true, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	principal, _ := auth.PrincipalFrom(ctx)
	token, expiresAt, err := r.Tokens.IssuePlayground(ctx, principal, playgroundTokenTTL)
	if err != nil {
		return nil, err
	}
	return &store.Token{Token: token, ExpiresAt: expiresAt.UTC().Format("2006-01-02T15:04:05.000Z")}, nil
}

func (r *queryResolver) Webhooks(ctx context.Context) ([]*store.Webhook, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	return pointers(r.WebhookStore.List(ctx))
}

func (r *queryResolver) Webhook(ctx context.Context, id string) (*store.Webhook, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	return nullable(r.WebhookStore.Get(ctx, id))
}

func (r *queryResolver) APIKeys(ctx context.Context) ([]*store.APIKey, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	return pointers(r.APIKeyStore.List(ctx))
}

func (r *queryResolver) APIKey(ctx context.Context, input map[string]any) (*store.APIKey, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
	id, _ := input["id"].(string)
	return nullable(r.APIKeyStore.Get(ctx, id))
}

func (r *queryResolver) GetAPIKeyRoles(ctx context.Context) ([]*store.Role, error) {
	if err := r.authorize(ctx, false, store.FlagAPIKeysAndWebhooks); err != nil {
		return nil, err
	}
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
