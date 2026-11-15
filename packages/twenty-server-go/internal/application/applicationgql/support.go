package applicationgql

import (
	"context"
	"fmt"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/application/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const flagApplications = "APPLICATIONS"

type Resolver struct {
	Applications  *store.Applications
	TimelineTypes *store.TimelineActivityTypes
	Permissions   *accessstore.Permissions
}

func (r *Resolver) authorize(ctx context.Context) error {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.ErrUnauthenticated
	}
	allowed, err := r.Permissions.Has(ctx, principal, flagApplications)
	if err != nil {
		return err
	}
	if !allowed {
		return fmt.Errorf("%w: missing the %s permission", accessstore.ErrForbidden, flagApplications)
	}
	return nil
}

func pointer[TValue any](value TValue, err error) (*TValue, error) {
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
