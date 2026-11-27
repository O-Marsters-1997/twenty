package membership_test

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/membership"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID   = "c1000000-0000-4000-8000-000000000001"
	applicationID = "c2000000-0000-4000-8000-000000000001"
	roleID        = "d0000000-0000-4000-8000-000000000001"
)

func newStore(t *testing.T) (*membership.Store, *pgxpool.Pool) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	for _, statement := range []string{
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('` + applicationID + `', gen_random_uuid(), 'custom', '` + workspaceID + `')`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + roleID + `', 'Member', '` + workspaceID + `', gen_random_uuid(), '` + applicationID + `')`,
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus", "defaultRoleId") VALUES ('` + workspaceID + `', 'acme', '` + applicationID + `', 'PENDING_CREATION', '` + roleID + `')`,
	} {
		tx, err := pool.Begin(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed: %v", err)
		}
		if err := tx.Commit(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	return membership.New(pool), pool
}

func count(t *testing.T, pool *pgxpool.Pool, query string, args ...any) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(t.Context(), query, args...).Scan(&n); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return n
}

func TestCreateUser(t *testing.T) {
	t.Parallel()
	store, pool := newStore(t)
	id, err := store.CreateUser(t.Context(), membership.NewUser{Email: "Ada@Example.com", FirstName: "Ada", PasswordHash: "hash"})
	if err != nil {
		t.Fatal(err)
	}
	if n := count(t, pool, `SELECT count(*) FROM core."user" WHERE id = $1 AND locale = 'en' AND "passwordHash" = 'hash' AND NOT "isEmailVerified"`, id); n != 1 {
		t.Errorf("created user rows = %d, want 1", n)
	}
	if _, err := store.CreateUser(t.Context(), membership.NewUser{Email: "ada@example.com"}); !errors.Is(err, membership.ErrEmailTaken) {
		t.Errorf("duplicate email error = %v, want ErrEmailTaken", err)
	}
}

func TestAddUserToWorkspace(t *testing.T) {
	t.Parallel()
	store, pool := newStore(t)
	userID, err := store.CreateUser(t.Context(), membership.NewUser{Email: "bea@example.com", FirstName: "Bea", LastName: "Ng", Locale: "fr-FR"})
	if err != nil {
		t.Fatal(err)
	}
	userWorkspaceID, err := store.AddUserToWorkspace(t.Context(), userID, workspaceID)
	if err != nil {
		t.Fatal(err)
	}
	again, err := store.AddUserToWorkspace(t.Context(), userID, workspaceID)
	if err != nil || again != userWorkspaceID {
		t.Fatalf("second add = %q, %v; want %q", again, err, userWorkspaceID)
	}
	checks := map[string]int{
		`SELECT count(*) FROM core."userWorkspace" WHERE id = $1 AND "userId" = $2 AND locale = 'fr-FR'`:                                                                                                   1,
		`SELECT count(*) FROM core."roleTarget" WHERE "userWorkspaceId" = $1 AND $2::uuid IS NOT NULL AND "roleId" = '` + roleID + `'`:                                                                     1,
		`SELECT count(*) FROM core."keyValuePair" WHERE $1::uuid IS NOT NULL AND "userId" = $2 AND "workspaceId" = '` + workspaceID + `' AND key = 'ONBOARDING_CREATE_PROFILE_PENDING' AND value = 'true'`: 1,
	}
	for query, want := range checks {
		if n := count(t, pool, query, userWorkspaceID, userID); n != want {
			t.Errorf("%s = %d, want %d", query, n, want)
		}
	}
	if n := count(t, pool, `SELECT count(*) FROM workspace_2abogkkt2zd45pa9aun09djpf."workspaceMember" WHERE "userId" = $1 AND "userEmail" = 'bea@example.com' AND "nameFirstName" = 'Bea' AND "nameLastName" = 'Ng' AND locale = 'fr-FR'`, userID); n != 1 {
		t.Errorf("workspace members = %d, want 1", n)
	}
	if _, err := store.AddUserToWorkspace(t.Context(), "20202020-0000-4000-8000-0000000000ff", workspaceID); !errors.Is(err, membership.ErrUserNotFound) {
		t.Errorf("unknown user error = %v, want ErrUserNotFound", err)
	}
	if _, err := store.AddUserToWorkspace(t.Context(), userID, "20202020-0000-4000-8000-0000000000ff"); !errors.Is(err, membership.ErrWorkspaceNotFound) {
		t.Errorf("unknown workspace error = %v, want ErrWorkspaceNotFound", err)
	}
}

func TestPersonalInvitation(t *testing.T) {
	t.Parallel()
	store, pool := newStore(t)
	for _, row := range []struct{ token, expiry string }{{"live", "now() + interval '1 day'"}, {"stale", "now() - interval '1 day'"}} {
		if _, err := pool.Exec(t.Context(),
			`INSERT INTO core."appToken" ("workspaceId", type, value, context, "expiresAt") VALUES ($1, 'INVITATION_TOKEN', $2, '{"email":"cy@example.com"}', `+row.expiry+`)`,
			workspaceID, row.token); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := store.ValidatePersonalInvitation(t.Context(), workspaceID, "live", "CY@example.com"); err != nil {
		t.Errorf("valid invitation: %v", err)
	}
	for name, tc := range map[string]struct {
		token, email string
		want         error
	}{
		"wrong email":   {"live", "other@example.com", membership.ErrInvitationInvalid},
		"unknown token": {"nope", "cy@example.com", membership.ErrInvitationInvalid},
		"expired":       {"stale", "cy@example.com", membership.ErrInvitationExpired},
	} {
		if _, err := store.ValidatePersonalInvitation(t.Context(), workspaceID, tc.token, tc.email); !errors.Is(err, tc.want) {
			t.Errorf("%s: error = %v, want %v", name, err, tc.want)
		}
	}
	if err := store.InvalidatePersonalInvitation(t.Context(), workspaceID, "live"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ValidatePersonalInvitation(t.Context(), workspaceID, "live", "cy@example.com"); !errors.Is(err, membership.ErrInvitationInvalid) {
		t.Errorf("after invalidate error = %v, want ErrInvitationInvalid", err)
	}
}
