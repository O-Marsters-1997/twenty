package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func (f fixture) addAPIKey(t *testing.T, workspaceID string, revoked bool, expiresIn time.Duration) string {
	t.Helper()
	apiKeyID := uuid.NewString()
	var revokedAt *time.Time
	if revoked {
		now := time.Now()
		revokedAt = &now
	}
	_, err := f.pool.Exec(t.Context(),
		`INSERT INTO core."apiKey" (id, name, "expiresAt", "revokedAt", "workspaceId") VALUES ($1, 'key', $2, $3, $4)`,
		apiKeyID, time.Now().Add(expiresIn), revokedAt, workspaceID)
	if err != nil {
		t.Fatal(err)
	}
	return apiKeyID
}

func (f fixture) addWorkspace(t *testing.T) string {
	t.Helper()
	workspaceID, applicationID := uuid.NewString(), uuid.NewString()
	tx, err := f.pool.Begin(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := tx.Rollback(context.Background()); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			t.Error(err)
		}
	})
	if _, err := tx.Exec(t.Context(),
		`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus") VALUES ($1, $3, $2, 'PENDING_CREATION')`,
		workspaceID, applicationID, "ws-"+workspaceID); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(t.Context(),
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ($1, gen_random_uuid(), 'custom', $2)`,
		applicationID, workspaceID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatal(err)
	}
	return workspaceID
}

func apiKeyClaims(apiKeyID, workspaceID string) jwt.MapClaims {
	return jwt.MapClaims{
		"sub":         workspaceID,
		"jti":         apiKeyID,
		"type":        "API_KEY",
		"workspaceId": workspaceID,
		"exp":         time.Now().Add(time.Hour).Unix(),
	}
}

func TestJWTVerifier_Verify_apiKey(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	workspaceID := f.addWorkspace(t)
	otherWorkspaceID := f.addWorkspace(t)
	live := f.addAPIKey(t, workspaceID, false, time.Hour)
	revoked := f.addAPIKey(t, workspaceID, true, time.Hour)
	expired := f.addAPIKey(t, workspaceID, false, -time.Hour)

	t.Run("accepts a live key and returns an API-key principal", func(t *testing.T) {
		t.Parallel()
		want := auth.Principal{WorkspaceID: workspaceID, APIKeyID: live}
		tests := []struct{ name, token string }{
			{"API_KEY secret", signHS256(t, legacySecret(workspaceID, "API_KEY"), apiKeyClaims(live, workspaceID))},
			{"ACCESS secret issued before 2025-12-12", signHS256(t, legacySecret(workspaceID, "ACCESS"), apiKeyClaims(live, workspaceID))},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := f.verifier.Verify(t.Context(), tt.token)
				if err != nil {
					t.Errorf("Verify() error = %v", err)
				}
				if diff := cmp.Diff(want, got); diff != "" {
					t.Errorf("Verify() principal (-want +got):\n%s", diff)
				}
			})
		}
	})

	t.Run("rejects", func(t *testing.T) {
		t.Parallel()
		tests := []struct{ name, token string }{
			{"revoked key", signHS256(t, legacySecret(workspaceID, "API_KEY"), apiKeyClaims(revoked, workspaceID))},
			{"expired key", signHS256(t, legacySecret(workspaceID, "API_KEY"), apiKeyClaims(expired, workspaceID))},
			{"unknown key", signHS256(t, legacySecret(workspaceID, "API_KEY"), apiKeyClaims(uuid.NewString(), workspaceID))},
			{"key of another workspace", signHS256(t, legacySecret(otherWorkspaceID, "API_KEY"), apiKeyClaims(live, otherWorkspaceID))},
			{"wrong secret", signHS256(t, "wrong", apiKeyClaims(live, workspaceID))},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if _, err := f.verifier.Verify(t.Context(), tt.token); !errors.Is(err, auth.ErrUnauthenticated) {
					t.Errorf("Verify() error = %v, want %v", err, auth.ErrUnauthenticated)
				}
			})
		}
	})
}
