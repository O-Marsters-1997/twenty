package accessgql

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
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

func (r *Resolver) actingRoleIDs(ctx context.Context) ([]string, error) {
	principal, _ := auth.PrincipalFrom(ctx)
	return r.RoleStore.ActingRoleIDs(ctx, principal.UserWorkspaceID)
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
