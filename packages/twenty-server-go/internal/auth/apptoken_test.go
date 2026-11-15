package auth_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

func addUser(t *testing.T, pool *pgxpool.Pool, email string, passwordHash *string, workspaceIDs ...string) string {
	t.Helper()
	userID := uuid.NewString()
	if _, err := pool.Exec(t.Context(), `INSERT INTO core."user" (id, email, "passwordHash") VALUES ($1, $2, $3)`, userID, email, passwordHash); err != nil {
		t.Fatal(err)
	}
	for _, workspaceID := range workspaceIDs {
		if _, err := pool.Exec(t.Context(), `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES (gen_random_uuid(), $1, $2)`, userID, workspaceID); err != nil {
			t.Fatal(err)
		}
	}
	return userID
}

func TestAppTokenStore_emailVerification(t *testing.T) {
	t.Parallel()
	pool := newOriginPool(t)
	store := auth.NewAppTokenStore(pool)
	userID := addUser(t, pool, "ada@example.com", nil)

	t.Run("a issued token validates once for its own email", func(t *testing.T) {
		issued, err := store.IssueEmailVerification(t.Context(), userID, "ada@example.com", time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		if len(issued.Token) != 64 {
			t.Errorf("Token = %q, want 64 hex characters", issued.Token)
		}
		got, err := store.ValidateEmailVerification(t.Context(), issued.Token, "ada@example.com")
		if err != nil || got != userID {
			t.Errorf("ValidateEmailVerification() = %q, %v, want %q, nil", got, err, userID)
		}
	})

	t.Run("the plain token is never stored", func(t *testing.T) {
		issued, err := store.IssueEmailVerification(t.Context(), userID, "ada@example.com", time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		var stored string
		if err := pool.QueryRow(t.Context(), `SELECT value FROM core."appToken" WHERE value = $1`, auth.HashAppToken(issued.Token)).Scan(&stored); err != nil {
			t.Fatalf("hashed token not found: %v", err)
		}
		var plainRows int
		if err := pool.QueryRow(t.Context(), `SELECT count(*) FROM core."appToken" WHERE value = $1`, issued.Token).Scan(&plainRows); err != nil || plainRows != 0 {
			t.Errorf("plain token rows = %d, %v, want 0", plainRows, err)
		}
	})

	failures := []struct {
		name  string
		setup func(t *testing.T) (token, email string)
		want  error
	}{
		{"unknown token", func(*testing.T) (string, string) { return strings.Repeat("0", 64), "ada@example.com" }, auth.ErrTokenInvalid},
		{"expired token", func(t *testing.T) (string, string) {
			issued, err := store.IssueEmailVerification(t.Context(), userID, "ada@example.com", -time.Minute)
			if err != nil {
				t.Fatal(err)
			}
			return issued.Token, "ada@example.com"
		}, auth.ErrTokenExpired},
		{"another email", func(t *testing.T) (string, string) {
			issued, err := store.IssueEmailVerification(t.Context(), userID, "ada@example.com", time.Hour)
			if err != nil {
				t.Fatal(err)
			}
			return issued.Token, "grace@example.com"
		}, auth.ErrTokenEmailMismatch},
	}
	for _, tt := range failures {
		t.Run(tt.name, func(t *testing.T) {
			token, email := tt.setup(t)
			if _, err := store.ValidateEmailVerification(t.Context(), token, email); !errors.Is(err, tt.want) {
				t.Errorf("ValidateEmailVerification() error = %v, want %v", err, tt.want)
			}
		})
	}

	t.Run("an already verified email", func(t *testing.T) {
		verifiedID := addUser(t, pool, "verified@example.com", nil)
		if _, err := pool.Exec(t.Context(), `UPDATE core."user" SET "isEmailVerified" = true WHERE id = $1`, verifiedID); err != nil {
			t.Fatal(err)
		}
		issued, err := store.IssueEmailVerification(t.Context(), verifiedID, "verified@example.com", time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := store.ValidateEmailVerification(t.Context(), issued.Token, "verified@example.com"); !errors.Is(err, auth.ErrEmailAlreadyVerified) {
			t.Errorf("ValidateEmailVerification() error = %v, want ErrEmailAlreadyVerified", err)
		}
	})
}

func TestAppTokenStore_passwordReset(t *testing.T) {
	t.Parallel()
	pool := newOriginPool(t)
	store := auth.NewAppTokenStore(pool)
	userID := addUser(t, pool, "ada@example.com", nil, seedWorkspaceID)

	t.Run("a rotated token validates and replaces the previous one", func(t *testing.T) {
		first, err := store.RotatePasswordReset(t.Context(), userID, seedWorkspaceID, time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		second, err := store.RotatePasswordReset(t.Context(), userID, seedWorkspaceID, time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := store.ValidatePasswordReset(t.Context(), first.Token); !errors.Is(err, auth.ErrTokenInvalid) {
			t.Errorf("ValidatePasswordReset(first) error = %v, want ErrTokenInvalid", err)
		}
		if got, err := store.ValidatePasswordReset(t.Context(), second.Token); err != nil || got != userID {
			t.Errorf("ValidatePasswordReset(second) = %q, %v, want %q, nil", got, err, userID)
		}
	})

	t.Run("an expired token is invalid", func(t *testing.T) {
		issued, err := store.RotatePasswordReset(t.Context(), userID, seedWorkspaceID, -time.Minute)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := store.ValidatePasswordReset(t.Context(), issued.Token); !errors.Is(err, auth.ErrTokenInvalid) {
			t.Errorf("ValidatePasswordReset() error = %v, want ErrTokenInvalid", err)
		}
	})

	t.Run("invalidating revokes the live token", func(t *testing.T) {
		issued, err := store.RotatePasswordReset(t.Context(), userID, seedWorkspaceID, time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		if err := store.InvalidatePasswordReset(t.Context(), userID); err != nil {
			t.Fatal(err)
		}
		if _, err := store.ValidatePasswordReset(t.Context(), issued.Token); !errors.Is(err, auth.ErrTokenInvalid) {
			t.Errorf("ValidatePasswordReset() error = %v, want ErrTokenInvalid", err)
		}
	})
}

type recordingSender struct{ sent []systemmail.Message }

func (s *recordingSender) Send(_ context.Context, message systemmail.Message) error {
	s.sent = append(s.sent, message)
	return nil
}

func TestPasswordResetRequester_Request(t *testing.T) {
	t.Parallel()
	pool := newOriginPool(t)
	hash := "stored-hash"
	addUser(t, pool, "has-password@example.com", &hash, seedWorkspaceID, otherWorkspaceID)
	addUser(t, pool, "no-password@example.com", nil, otherWorkspaceID)
	addUser(t, pool, "lonely@example.com", &hash)
	if _, err := pool.Exec(t.Context(), `UPDATE core.workspace SET "isPasswordAuthEnabled" = false WHERE id = $1`, seedWorkspaceID); err != nil {
		t.Fatal(err)
	}

	newRequester := func() (auth.PasswordResetRequester, *recordingSender) {
		sender := &recordingSender{}
		return auth.PasswordResetRequester{
			Tokens: auth.NewAppTokenStore(pool),
			Sender: sender,
			TTL:    5 * time.Minute,
			BuildLink: func(_ context.Context, workspaceID, token string) (string, error) {
				return "https://" + workspaceID + ".example.com/reset-password/" + token, nil
			},
		}, sender
	}

	t.Run("sends a reset link for the first password-enabled workspace", func(t *testing.T) {
		requester, sender := newRequester()
		if err := requester.Request(t.Context(), "has-password@example.com", seedWorkspaceID); err != nil {
			t.Fatal(err)
		}
		if len(sender.sent) != 1 {
			t.Fatalf("sent %d emails, want 1", len(sender.sent))
		}
		message := sender.sent[0]
		if message.To != "has-password@example.com" || message.Subject != "Action Needed to Reset Password" || !strings.Contains(message.Text, otherWorkspaceID) {
			t.Errorf("message = %+v, want a reset email linking to the other workspace", message)
		}
	})

	t.Run("a user without a password gets the set-password email", func(t *testing.T) {
		requester, sender := newRequester()
		if err := requester.Request(t.Context(), "no-password@example.com", ""); err != nil {
			t.Fatal(err)
		}
		if len(sender.sent) != 1 || sender.sent[0].Subject != "Action Needed to Set Password" {
			t.Errorf("sent = %+v, want one set-password email", sender.sent)
		}
	})

	silent := []struct{ name, email string }{
		{"unknown email", "nobody@example.com"},
		{"user with no password-enabled workspace", "lonely@example.com"},
	}
	for _, tt := range silent {
		t.Run(tt.name+" is answered like a success without sending", func(t *testing.T) {
			requester, sender := newRequester()
			if err := requester.Request(t.Context(), tt.email, ""); err != nil {
				t.Errorf("Request() error = %v, want nil", err)
			}
			if len(sender.sent) != 0 {
				t.Errorf("sent = %+v, want nothing", sender.sent)
			}
		})
	}
}
