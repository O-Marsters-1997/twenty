package invitationgql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/invitationgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	adminUserWorkspaceID  = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a02"
	memberUserWorkspaceID = "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a04"
	missingID             = "00000000-0000-4000-8000-000000000000"
)

type harness struct {
	graphql http.Handler
	pool    *pgxpool.Pool
}

func (h harness) as(userWorkspaceID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserWorkspaceID: userWorkspaceID})))
	})
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	h := harness{pool: pool, graphql: invitationgql.NewHandler(&invitationgql.Resolver{
		Invitations:     store.NewInvitations(pool),
		ApprovedDomains: store.NewApprovedDomains(pool),
		Permissions:     accessstore.NewPermissions(pool),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))}
	h.seedSession(t, "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a01", adminUserWorkspaceID, "Workspace admin", true)
	h.seedSession(t, "0b7a6c1e-3f55-4a47-8d6e-6c1f1b7f2a03", memberUserWorkspaceID, "Plain member", false)
	return h
}

func (h harness) seedSession(t *testing.T, userID, userWorkspaceID, roleLabel string, canUpdateAllSettings bool) {
	t.Helper()
	statements := []string{
		`INSERT INTO core."user" (id, email) VALUES ('` + userID + `', '` + userID + `@example.com')`,
		`INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES ('` + userWorkspaceID + `', '` + userID + `', '` + workspace.PinnedWorkspaceID + `')`,
	}
	for _, statement := range statements {
		if _, err := h.pool.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed session: %v", err)
		}
	}
	var roleID string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core.role (label, "workspaceId", "canUpdateAllSettings", "canBeAssignedToApiKeys", "universalIdentifier", "applicationId")
		VALUES ($1, $2::uuid, $3, false, gen_random_uuid(), (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $2::uuid)) RETURNING id::text`,
		roleLabel, workspace.PinnedWorkspaceID, canUpdateAllSettings).Scan(&roleID)
	if err != nil {
		t.Fatalf("seed role: %v", err)
	}
	_, err = h.pool.Exec(t.Context(), `INSERT INTO core."roleTarget" ("roleId", "userWorkspaceId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, userWorkspaceID, workspace.PinnedWorkspaceID)
	if err != nil {
		t.Fatalf("seed role target: %v", err)
	}
}

func (h harness) insertInvitation(t *testing.T, tokenType, email string) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core."appToken" (type, value, "expiresAt", "workspaceId", context)
		VALUES ($1, gen_random_uuid()::text, '2030-01-01T00:00:00Z', $2::uuid, jsonb_build_object('email', $3::text)) RETURNING id::text`,
		tokenType, workspace.PinnedWorkspaceID, email).Scan(&id)
	if err != nil {
		t.Fatalf("insert invitation: %v", err)
	}
	return id
}

func (h harness) insertDomain(t *testing.T, domain string) string {
	t.Helper()
	var id string
	err := h.pool.QueryRow(t.Context(), `INSERT INTO core."approvedAccessDomain" (domain, "isValidated", "workspaceId") VALUES ($1, true, $2::uuid) RETURNING id::text`,
		domain, workspace.PinnedWorkspaceID).Scan(&id)
	if err != nil {
		t.Fatalf("insert approved access domain: %v", err)
	}
	return id
}

func send(t *testing.T, handler http.Handler, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func TestGetWorkspaceInvitations_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.insertInvitation(t, "INVITATION_TOKEN", "ann@example.com")
	h.insertInvitation(t, "REFRESH_TOKEN", "not-an-invitation@example.com")
	golden.Assert(t, h.as(adminUserWorkspaceID), "testdata", "GetWorkspaceInvitations", "data.findWorkspaceInvitations.*.id")
}

func TestGetApprovedAccessDomains_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.insertDomain(t, "example.com")
	golden.Assert(t, h.as(adminUserWorkspaceID), "testdata", "GetApprovedAccessDomains", "data.getApprovedAccessDomains.*.id", "data.getApprovedAccessDomains.*.createdAt")
}

func TestDeleteWorkspaceInvitation(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const mutation = `mutation DeleteWorkspaceInvitation($appTokenId: String!) { deleteWorkspaceInvitation(appTokenId: $appTokenId) }`

	t.Run("unknown id matches the Node golden", func(t *testing.T) {
		t.Parallel()
		golden.Assert(t, h.as(adminUserWorkspaceID), "testdata", "DeleteWorkspaceInvitation")
	})

	t.Run("removes an invitation and reports success", func(t *testing.T) {
		t.Parallel()
		id := h.insertInvitation(t, "ONBOARDING_INVITATION_TOKEN", "bo@example.com")
		got := send(t, h.as(adminUserWorkspaceID), "DeleteWorkspaceInvitation", mutation, map[string]any{"appTokenId": id})
		if diff := cmp.Diff(map[string]any{"data": map[string]any{"deleteWorkspaceInvitation": "success"}}, got); diff != "" {
			t.Errorf("deleteWorkspaceInvitation (-want +got):\n%s", diff)
		}
		again := send(t, h.as(adminUserWorkspaceID), "DeleteWorkspaceInvitation", mutation, map[string]any{"appTokenId": id})
		if diff := cmp.Diff(map[string]any{"data": map[string]any{"deleteWorkspaceInvitation": "error"}}, again); diff != "" {
			t.Errorf("second deleteWorkspaceInvitation (-want +got):\n%s", diff)
		}
	})

	t.Run("leaves tokens that are not invitations", func(t *testing.T) {
		t.Parallel()
		id := h.insertInvitation(t, "REFRESH_TOKEN", "cy@example.com")
		got := send(t, h.as(adminUserWorkspaceID), "DeleteWorkspaceInvitation", mutation, map[string]any{"appTokenId": id})
		if diff := cmp.Diff(map[string]any{"data": map[string]any{"deleteWorkspaceInvitation": "error"}}, got); diff != "" {
			t.Errorf("deleteWorkspaceInvitation (-want +got):\n%s", diff)
		}
	})
}

func TestDeleteApprovedAccessDomain(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const mutation = `mutation DeleteApprovedAccessDomain($input: DeleteApprovedAccessDomainInput!) { deleteApprovedAccessDomain(input: $input) }`

	t.Run("matches the Node golden", func(t *testing.T) {
		t.Parallel()
		id := h.insertDomain(t, "golden.example")
		c, err := golden.Load("testdata", "DeleteApprovedAccessDomain")
		if err != nil {
			t.Fatal(err)
		}
		got := send(t, h.as(adminUserWorkspaceID), c.Operation, c.Query, map[string]any{"input": map[string]any{"id": id}})
		var want map[string]any
		if err := json.Unmarshal(c.Response, &want); err != nil {
			t.Fatal(err)
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("DeleteApprovedAccessDomain (-want +got):\n%s", diff)
		}
	})

	tests := []struct {
		name     string
		id       string
		wantCode string
	}{
		{"unknown domain", missingID, "NOT_FOUND"},
		{"id that is not a UUID", "nope", "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := send(t, h.as(adminUserWorkspaceID), "DeleteApprovedAccessDomain", mutation, map[string]any{"input": map[string]any{"id": tt.id}})
			if code := errorCode(t, got); code != tt.wantCode {
				t.Errorf("error code = %q, want %q", code, tt.wantCode)
			}
		})
	}
}

func TestOperations_requireWorkspaceMembersPermission(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
	}{
		{"list invitations", "GetWorkspaceInvitations", `query GetWorkspaceInvitations { findWorkspaceInvitations { id } }`, nil},
		{"list domains", "GetApprovedAccessDomains", `query GetApprovedAccessDomains { getApprovedAccessDomains { id } }`, nil},
		{"delete invitation", "DeleteWorkspaceInvitation", `mutation DeleteWorkspaceInvitation($appTokenId: String!) { deleteWorkspaceInvitation(appTokenId: $appTokenId) }`, map[string]any{"appTokenId": missingID}},
		{"delete domain", "DeleteApprovedAccessDomain", `mutation DeleteApprovedAccessDomain($input: DeleteApprovedAccessDomainInput!) { deleteApprovedAccessDomain(input: $input) }`, map[string]any{"input": map[string]any{"id": missingID}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := send(t, h.as(memberUserWorkspaceID), tt.operation, tt.query, tt.variables)
			if code := errorCode(t, got); code != "FORBIDDEN" {
				t.Errorf("error code = %q, want FORBIDDEN", code)
			}
		})
	}
}
