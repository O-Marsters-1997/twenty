package auth_test

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	seedWorkspaceID    = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	otherWorkspaceID   = "30303030-1c25-4d02-bf25-6aeccf7ea419"
	acmeApplicationID  = "20202020-0687-4c41-b707-ed1bfca972a7"
	otherApplicationID = "30303030-0687-4c41-b707-ed1bfca972a7"
)

func newOriginPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	for _, row := range []struct{ id, subdomain, applicationID, createdAt string }{
		{seedWorkspaceID, "acme", acmeApplicationID, "2024-01-01"},
		{otherWorkspaceID, "other", otherApplicationID, "2099-01-01"},
	} {
		tx, err := pool.Begin(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		for _, statement := range []struct {
			sql  string
			args []any
		}{
			{`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus", "createdAt") VALUES ($1, $2, $3, 'PENDING_CREATION', $4::timestamptz)`,
				[]any{row.id, row.subdomain, row.applicationID, row.createdAt}},
			{`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ($1, gen_random_uuid(), 'custom', $2)`,
				[]any{row.applicationID, row.id}},
		} {
			if _, err := tx.Exec(t.Context(), statement.sql, statement.args...); err != nil {
				t.Fatal(err)
			}
		}
		if err := tx.Commit(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	return pool
}

func TestOriginResolver_ByOriginOrDefault(t *testing.T) {
	t.Parallel()
	pool := newOriginPool(t)

	t.Run("single-workspace mode", func(t *testing.T) {
		t.Parallel()
		tests := []struct {
			name string
			seed string
			want string
		}{
			{"prefers the seed workspace", seedWorkspaceID, seedWorkspaceID},
			{"otherwise the newest", "", otherWorkspaceID},
		}
		for _, tt := range tests {
			resolver := auth.NewOriginResolver(pool, auth.OriginConfig{FrontURL: "https://crm.example.com", SeedWorkspaceID: tt.seed})
			got, err := resolver.ByOriginOrDefault(t.Context(), "https://anything.example.org")
			if err != nil || got.ID != tt.want {
				t.Errorf("ByOriginOrDefault() %s = %q, %v, want %q", tt.name, got.ID, err, tt.want)
			}
		}
	})

	t.Run("multi-workspace mode", func(t *testing.T) {
		t.Parallel()
		resolver := auth.NewOriginResolver(pool, auth.OriginConfig{MultiWorkspace: true, FrontURL: "https://crm.example.com", DefaultSubdomain: "app"})
		tests := []struct {
			name   string
			origin string
			want   string
		}{
			{"a workspace subdomain", "https://acme.crm.example.com", seedWorkspaceID},
			{"an upper-case host", "https://ACME.crm.example.com", seedWorkspaceID},
			{"another subdomain with a port", "https://other.crm.example.com:8443", otherWorkspaceID},
		}
		for _, tt := range tests {
			got, err := resolver.ByOriginOrDefault(t.Context(), tt.origin)
			if err != nil || got.ID != tt.want {
				t.Errorf("ByOriginOrDefault(%s) = %q, %v, want %q", tt.name, got.ID, err, tt.want)
			}
		}
		for _, origin := range []string{"https://crm.example.com", "https://app.crm.example.com", "https://ghost.crm.example.com", "https://acme.elsewhere.org"} {
			if _, err := resolver.ByOriginOrDefault(t.Context(), origin); !errors.Is(err, auth.ErrWorkspaceNotFound) {
				t.Errorf("ByOriginOrDefault(%s) error = %v, want ErrWorkspaceNotFound", origin, err)
			}
		}
	})
}
