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
	RoleStore    *store.Roles
	Permissions  *store.Permissions
	Tokens       TokenIssuer
	FeatureFlags *store.FeatureFlags
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

func (r *Resolver) Role() RoleResolver { return &roleResolver{r} }

func (r *Resolver) WorkspaceMember() WorkspaceMemberResolver { return &workspaceMemberResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	apiKeyResolver   struct{ *Resolver }
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
	roleResolver     struct{ *Resolver }

	workspaceMemberResolver struct{ *Resolver }
)

func (r *workspaceMemberResolver) Roles(ctx context.Context, member *store.WorkspaceMember) ([]*store.Role, error) {
	return pointers(r.RoleStore.ForUserWorkspace(ctx, member.UserWorkspaceID))
}

func (r *mutationResolver) UpdateWorkspaceMemberRole(ctx context.Context, workspaceMemberID string, roleID string) (*store.WorkspaceMember, error) {
	if err := r.authorize(ctx, true, store.FlagRoles); err != nil {
		return nil, err
	}
	principal, _ := auth.PrincipalFrom(ctx)
	return pointer(r.RoleStore.AssignToWorkspaceMember(ctx, workspaceMemberID, roleID, principal.UserWorkspaceID))
}

func (r *mutationResolver) UpdateWorkspaceMemberSettings(ctx context.Context, input map[string]any) (bool, error) {
	if err := r.authorize(ctx, false); err != nil {
		return false, err
	}
	principal, _ := auth.PrincipalFrom(ctx)
	workspaceMemberID, _ := input["workspaceMemberId"].(string)
	update, _ := input["update"].(map[string]any)
	isSelf := principal.WorkspaceMemberID == workspaceMemberID
	if !isSelf && principal.UserID != "" && principal.APIKeyID == "" {
		userID, err := r.RoleStore.MemberUserID(ctx, workspaceMemberID)
		if err != nil {
			return false, err
		}
		isSelf = userID == principal.UserID
	}
	if !isSelf {
		if err := r.authorize(ctx, false, store.FlagWorkspaceMembers); err != nil {
			return false, err
		}
	}
	if err := r.RoleStore.UpdateMemberSettings(ctx, workspaceMemberID, update); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) UpdateLabPublicFeatureFlag(ctx context.Context, input map[string]any) (*store.FeatureFlag, error) {
	if err := r.authorize(ctx, false, store.FlagWorkspace); err != nil {
		return nil, err
	}
	key, _ := input["publicFeatureFlag"].(string)
	value, _ := input["value"].(bool)
	return pointer(r.FeatureFlags.UpdatePublic(ctx, key, value))
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
	actingRoleIDs, err := r.actingRoleIDs(ctx)
	if err != nil {
		return nil, err
	}
	id, _ := updateRoleInput["id"].(string)
	updates, _ := updateRoleInput["update"].(map[string]any)
	return pointer(r.RoleStore.Update(ctx, id, updates, actingRoleIDs))
}

func (r *mutationResolver) DeleteOneRole(ctx context.Context, roleID string) (string, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return "", err
	}
	actingRoleIDs, err := r.actingRoleIDs(ctx)
	if err != nil {
		return "", err
	}
	return r.RoleStore.Delete(ctx, roleID, actingRoleIDs)
}

func (r *mutationResolver) UpsertObjectPermissions(ctx context.Context, input map[string]any) ([]*store.ObjectPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	roleID, _ := input["roleId"].(string)
	return pointers(r.RoleStore.UpsertObjectPermissions(ctx, roleID, inputList(input["objectPermissions"])))
}

func (r *mutationResolver) UpsertFieldPermissions(ctx context.Context, input map[string]any) ([]*store.FieldPermission, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	roleID, _ := input["roleId"].(string)
	return pointers(r.RoleStore.UpsertFieldPermissions(ctx, roleID, inputList(input["fieldPermissions"])))
}

func (r *mutationResolver) UpsertPermissionFlags(ctx context.Context, input map[string]any) ([]*store.RolePermissionFlag, error) {
	if err := r.authorize(ctx, false, store.FlagRoles); err != nil {
		return nil, err
	}
	roleID, _ := input["roleId"].(string)
	keys, _ := input["permissionFlagKeys"].([]string)
	return pointers(r.RoleStore.UpsertPermissionFlags(ctx, roleID, keys))
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

func (r *roleResolver) WorkspaceMembers(ctx context.Context, role *store.Role) ([]*store.WorkspaceMember, error) {
	return pointers(r.RoleStore.WorkspaceMembers(ctx, role.ID))
}

func (r *roleResolver) Agents(ctx context.Context, role *store.Role) ([]*store.RoleAgent, error) {
	return pointers(r.RoleStore.Agents(ctx, role.ID))
}

func (r *roleResolver) APIKeys(ctx context.Context, role *store.Role) ([]*store.RoleAPIKey, error) {
	return pointers(r.RoleStore.APIKeys(ctx, role.ID))
}

func (r *roleResolver) PermissionFlags(ctx context.Context, role *store.Role) ([]*store.RolePermissionFlag, error) {
	return pointers(r.RoleStore.RolePermissionFlags(ctx, role.ID))
}

func (r *roleResolver) ObjectPermissions(ctx context.Context, role *store.Role) ([]*store.ObjectPermission, error) {
	return pointers(r.RoleStore.ObjectPermissions(ctx, role.ID))
}

func (r *roleResolver) FieldPermissions(ctx context.Context, role *store.Role) ([]*store.FieldPermission, error) {
	return pointers(r.RoleStore.FieldPermissions(ctx, role.ID))
}

func (r *roleResolver) RowLevelPermissionPredicates(ctx context.Context, role *store.Role) ([]*store.RowLevelPermissionPredicate, error) {
	return pointers(r.RoleStore.Predicates(ctx, role.ID))
}

func (r *roleResolver) RowLevelPermissionPredicateGroups(ctx context.Context, role *store.Role) ([]*store.RowLevelPermissionPredicateGroup, error) {
	return pointers(r.RoleStore.PredicateGroups(ctx, role.ID))
}

func (r *Resolver) actingRoleIDs(ctx context.Context) ([]string, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	return r.RoleStore.ActingRoleIDs(ctx, principal.UserWorkspaceID)
}

func inputList(value any) []store.Input {
	items, _ := value.([]map[string]any)
	return items
}

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
