package onboardinggql_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding/onboardinggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID   = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	applicationID = "c2000000-0000-4000-8000-000000000001"
	userID        = "20202020-0000-4000-8000-0000000000a1"
)

type harness struct{ pool *pgxpool.Pool }

func newHarness(t *testing.T, activation string, vars map[string]string) *harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := [][]any{
		{`INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "activationStatus", "defaultRoleId", "databaseSchema") VALUES ($1, 'acme', $2, $3, gen_random_uuid(), 'workspace_acme')`, workspaceID, applicationID, activation},
		{`INSERT INTO core."user" (id, email) VALUES ($1, 'ada@example.com')`, userID},
	}
	for key, value := range vars {
		statements = append(statements, []any{`INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value, type) VALUES ($1, $2, $3, $4::jsonb, 'USER_VARIABLE')`, userID, workspaceID, key, value})
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer func() { _ = tx.Rollback(t.Context()) }()
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("relax constraints: %v", err)
	}
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement[0].(string), statement[1:]...); err != nil {
			t.Fatalf("seed %q: %v", statement[0], err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return &harness{pool: pool}
}

func (h *harness) handler() http.Handler {
	graphql := onboardinggql.NewHandler(&onboardinggql.Resolver{Store: onboarding.New(h.pool)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: userID, WorkspaceID: workspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *harness) send(t *testing.T, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler().ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func (h *harness) value(t *testing.T, key string) any {
	t.Helper()
	var raw []byte
	err := h.pool.QueryRow(t.Context(), `SELECT value FROM core."keyValuePair" WHERE "userId" = $1 AND "workspaceId" = $2 AND key = $3`, userID, workspaceID, key).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		t.Fatal(err)
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	return decoded
}

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		vars map[string]string
	}{
		{"SkipSyncEmailOnboardingStep", map[string]string{"ONBOARDING_CONNECT_ACCOUNT_PENDING": "true"}},
		{"GoBackToPreviousOnboardingStep", map[string]string{"ONBOARDING_REVERSIBLE_STEP_HISTORY": `["PROFILE_CREATION","SYNC_EMAIL"]`}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t, "ACTIVE", tt.vars)
			golden.Assert(t, h.handler(), "testdata", tt.name)
		})
	}
}

func TestSkipSyncEmailOnboardingStep(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($auto: Boolean!) { skipSyncEmailOnboardingStep(isAutoSkipped: $auto) { success } }`
	tests := []struct {
		name        string
		vars        map[string]string
		auto        bool
		wantPending any
		wantHistory any
	}{
		{"manual skip is recorded", map[string]string{"ONBOARDING_CONNECT_ACCOUNT_PENDING": "true"}, false, nil, []any{"SYNC_EMAIL"}},
		{"auto skip is not recorded", map[string]string{"ONBOARDING_CONNECT_ACCOUNT_PENDING": "true"}, true, nil, nil},
		{"skip without a pending step records nothing", nil, false, nil, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t, "ACTIVE", tt.vars)
			got := h.send(t, mutation, map[string]any{"auto": tt.auto})
			if diff := cmp.Diff(map[string]any{"data": map[string]any{"skipSyncEmailOnboardingStep": map[string]any{"success": true}}}, got); diff != "" {
				t.Errorf("response (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.wantPending, h.value(t, "ONBOARDING_CONNECT_ACCOUNT_PENDING")); diff != "" {
				t.Errorf("pending flag (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.wantHistory, h.value(t, "ONBOARDING_REVERSIBLE_STEP_HISTORY")); diff != "" {
				t.Errorf("history (-want +got):\n%s", diff)
			}
		})
	}
}

func TestGoBackToPreviousOnboardingStep(t *testing.T) {
	t.Parallel()
	const mutation = `mutation { goBackToPreviousOnboardingStep { onboardingStatus previousOnboardingStatus } }`
	t.Run("restores the latest step and reports where the user landed", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE", map[string]string{"ONBOARDING_REVERSIBLE_STEP_HISTORY": `["INVITE_TEAM"]`})
		got := h.send(t, mutation, nil)
		want := map[string]any{"data": map[string]any{"goBackToPreviousOnboardingStep": map[string]any{"onboardingStatus": "INVITE_TEAM", "previousOnboardingStatus": nil}}}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("response (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff(true, h.value(t, "ONBOARDING_INVITE_TEAM_PENDING")); diff != "" {
			t.Errorf("pending flag (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff([]any{}, h.value(t, "ONBOARDING_REVERSIBLE_STEP_HISTORY")); diff != "" {
			t.Errorf("history (-want +got):\n%s", diff)
		}
	})
	t.Run("rejects an empty history", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t, "ACTIVE", nil)
		got := h.send(t, mutation, nil)
		errs, _ := got["errors"].([]any)
		if len(errs) != 1 {
			t.Fatalf("errors = %v, want one", got["errors"])
		}
		if code := errs[0].(map[string]any)["extensions"].(map[string]any)["code"]; code != "NO_PREVIOUS_ONBOARDING_STEP" {
			t.Errorf("error code = %v, want NO_PREVIOUS_ONBOARDING_STEP", code)
		}
	})
}
