package accessgql

import (
	"context"
	"fmt"
	"maps"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

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

func (r *mutationResolver) CreateOneRole(ctx context.Context, createRoleInput map[string]any) (*store.Role, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointer(r.RoleStore.Create(ctx, createRoleInput))
}

func (r *mutationResolver) UpdateOneRole(ctx context.Context, updateRoleInput map[string]any) (*store.Role, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	acting, err := r.actingRoleIDs(ctx)
	if err != nil {
		return nil, err
	}
	return pointer(r.RoleStore.Update(ctx, acting, updateRoleInput))
}

func (r *mutationResolver) DeleteOneRole(ctx context.Context, roleID string) (string, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return "", err
	}
	acting, err := r.actingRoleIDs(ctx)
	if err != nil {
		return "", err
	}
	return r.RoleStore.Delete(ctx, acting, roleID)
}

func (r *mutationResolver) UpsertObjectPermissions(ctx context.Context, upsertObjectPermissionsInput map[string]any) ([]*store.ObjectPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.UpsertObjectPermissions(ctx, upsertObjectPermissionsInput))
}

func (r *mutationResolver) UpsertPermissionFlags(ctx context.Context, upsertPermissionFlagsInput map[string]any) ([]*store.RolePermissionFlag, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.UpsertPermissionFlags(ctx, upsertPermissionFlagsInput))
}

func (r *mutationResolver) UpsertFieldPermissions(ctx context.Context, upsertFieldPermissionsInput map[string]any) ([]*store.FieldPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.UpsertFieldPermissions(ctx, upsertFieldPermissionsInput))
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

func (r *queryResolver) GetRoles(ctx context.Context) ([]*store.Role, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.List(ctx))
}

func (r *queryResolver) GetRole(ctx context.Context, id string) (*store.Role, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointer(r.RoleStore.Get(ctx, id))
}

func (r *queryResolver) GetPermissionFlags(ctx context.Context) ([]*store.PermissionFlag, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.PermissionFlags(ctx))
}

func (r *roleResolver) WorkspaceMembers(ctx context.Context, obj *store.Role) ([]*store.WorkspaceMember, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.WorkspaceMembers(ctx, obj.ID))
}

func (r *roleResolver) Agents(ctx context.Context, obj *store.Role) ([]*store.RoleAgent, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.Agents(ctx, obj.ID))
}

func (r *roleResolver) APIKeys(ctx context.Context, obj *store.Role) ([]*store.APIKey, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.APIKeys(ctx, obj.ID))
}

func (r *roleResolver) PermissionFlags(ctx context.Context, obj *store.Role) ([]*store.RolePermissionFlag, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.RolePermissionFlags(ctx, obj.ID))
}

func (r *roleResolver) ObjectPermissions(ctx context.Context, obj *store.Role) ([]*store.ObjectPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.ObjectPermissions(ctx, obj.ID))
}

func (r *roleResolver) FieldPermissions(ctx context.Context, obj *store.Role) ([]*store.FieldPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.FieldPermissions(ctx, obj.ID))
}

func (r *roleResolver) RowLevelPermissionPredicates(ctx context.Context, obj *store.Role) ([]*store.RowLevelPermissionPredicate, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.Predicates(ctx, obj.ID))
}

func (r *roleResolver) RowLevelPermissionPredicateGroups(ctx context.Context, obj *store.Role) ([]*store.RowLevelPermissionPredicateGroup, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	return pointers(r.RoleStore.PredicateGroups(ctx, obj.ID))
}

func (r *Resolver) ApiKey() ApiKeyResolver { return &apiKeyResolver{r} }

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

func (r *Resolver) Role() RoleResolver { return &roleResolver{r} }

type (
	apiKeyResolver   struct{ *Resolver }
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
	roleResolver     struct{ *Resolver }
)
