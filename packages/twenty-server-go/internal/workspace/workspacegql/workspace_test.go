package workspacegql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace/workspacegql"
)

const (
	memberUserID   = "a1000000-0000-4000-8000-000000000001"
	acmeUserID     = "a1000000-0000-4000-8000-000000000002"
	personalUserID = "a1000000-0000-4000-8000-000000000003"
)

type harness struct {
	graphql   http.Handler
	pool      *pgxpool.Pool
	principal *auth.Principal
}

func (h harness) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.principal != nil {
		r = r.WithContext(auth.WithPrincipal(r.Context(), *h.principal))
	}
	h.graphql.ServeHTTP(w, r)
}

func newHarness(t *testing.T, principal *auth.Principal) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	origins := auth.NewOriginResolver(pool, auth.OriginConfig{MultiWorkspace: true, FrontURL: "http://localhost:3001", DefaultSubdomain: "app"})
	login := auth.NewPasswordLogin(pool, auth.NewPasswordHasher(), nil, origins, auth.PasswordLoginConfig{
		FrontURL:       mustParseURL(t, "http://localhost:3001"),
		ServerURL:      "http://localhost:3000",
		MultiWorkspace: true,
	})
	public := auth.NewPublicWorkspaces(pool, origins, login, auth.PublicWorkspaceConfig{PasswordEnabled: true, DefaultSubdomain: "app"})
	h := harness{
		graphql:   workspacegql.NewHandler(&workspacegql.Resolver{Workspaces: public}, slog.New(slog.NewTextHandler(io.Discard, nil))),
		pool:      pool,
		principal: principal,
	}
	h.exec(t, `UPDATE core.workspace SET subdomain = 'twenty', "displayName" = 'Twenty', logo = 'https://example.com/logo.png', "inviteHash" = 'invite-abc',
		"allowedIframeOrigins" = '{https://app.example.com}', "isPasswordAuthEnabled" = true, "isPasswordAuthBypassEnabled" = false,
		"isGoogleAuthEnabled" = true, "isGoogleAuthBypassEnabled" = false WHERE id = $1::uuid`, workspace.PinnedWorkspaceID)
	h.exec(t, `INSERT INTO core."user" (id, email, "isEmailVerified") VALUES ($1, 'member@example.com', true), ($2, 'pat@acme.com', true), ($3, 'sam@gmail.com', true)`,
		memberUserID, acmeUserID, personalUserID)
	h.exec(t, `INSERT INTO core."userWorkspace" ("userId", "workspaceId") VALUES ($1, $2)`, memberUserID, workspace.PinnedWorkspaceID)
	return h
}

func mustParseURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	parsed, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	return parsed
}

func (h harness) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func (h harness) send(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func (h harness) data(t *testing.T, operation, query string, variables map[string]any) map[string]any {
	t.Helper()
	decoded := h.send(t, operation, query, variables)
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("%s returned errors: %v", operation, errs)
	}
	return decoded["data"].(map[string]any)
}

func errorCode(t *testing.T, decoded map[string]any) string {
	t.Helper()
	errs, ok := decoded["errors"].([]any)
	if !ok || len(errs) == 0 {
		t.Fatalf("response = %v, want an error", decoded)
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
}

func TestWorkspaceOperations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	memberSession := &auth.Principal{UserID: memberUserID, WorkspaceID: workspace.PinnedWorkspaceID}
	tests := []struct {
		operation string
		principal *auth.Principal
	}{
		{"GetPublicWorkspaceDataByDomain", nil},
		{"GetPublicWorkspaceDataById", nil},
		{"GetWorkspaceFromInviteHash", nil},
		{"CheckUserExists", nil},
		{"CheckWorkspaceSubdomainAvailability", memberSession},
		{"GetWorkspaceCreationDefaults", &auth.Principal{UserID: acmeUserID}},
		{"GetWorkspaceIframeOrigins", memberSession},
	}
	for _, tt := range tests {
		t.Run(tt.operation, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, newHarness(t, tt.principal), "testdata", tt.operation)
		})
	}
}

func TestCheckUserExists(t *testing.T) {
	t.Parallel()
	h := newHarness(t, nil)
	h.exec(t, `INSERT INTO core."appToken" ("workspaceId", type, value, context, "expiresAt")
		VALUES ($1, 'INVITATION_TOKEN', 'tok', '{"email": "new@example.com"}', now() + interval '1 day')`, workspace.PinnedWorkspaceID)
	const query = `query CheckUserExists($email: String!) { checkUserExists(email: $email) { exists availableWorkspacesCount isEmailVerified } }`

	tests := []struct {
		name  string
		email string
		want  map[string]any
	}{
		{"invited address without a user", "new@example.com", map[string]any{"exists": false, "availableWorkspacesCount": float64(1), "isEmailVerified": false}},
		{"unknown address", "nobody@example.com", map[string]any{"exists": false, "availableWorkspacesCount": float64(0), "isEmailVerified": false}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := h.data(t, "CheckUserExists", query, map[string]any{"email": tt.email})["checkUserExists"]
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("checkUserExists(%q) (-want +got):\n%s", tt.email, diff)
			}
		})
	}
}

func TestPublicWorkspaceErrors(t *testing.T) {
	t.Parallel()
	h := newHarness(t, nil)
	tests := []struct {
		name      string
		operation string
		query     string
		variables map[string]any
		want      string
	}{
		{"unknown origin", "GetPublicWorkspaceDataByDomain", `query GetPublicWorkspaceDataByDomain($origin: String!) { getPublicWorkspaceDataByDomain(origin: $origin) { id } }`,
			map[string]any{"origin": "http://nobody.localhost:3001"}, "NOT_FOUND"},
		{"unknown id", "GetPublicWorkspaceDataById", `query GetPublicWorkspaceDataById($id: UUID!) { getPublicWorkspaceDataById(id: $id) { id } }`,
			map[string]any{"id": "00000000-0000-4000-8000-000000000000"}, "NOT_FOUND"},
		{"unknown invite hash", "GetWorkspaceFromInviteHash", `query GetWorkspaceFromInviteHash($inviteHash: String!) { findWorkspaceFromInviteHash(inviteHash: $inviteHash) { id } }`,
			map[string]any{"inviteHash": "nope"}, "BAD_USER_INPUT"},
		{"subdomain check without a session", "CheckWorkspaceSubdomainAvailability", `query CheckWorkspaceSubdomainAvailability($subdomain: String!) { checkWorkspaceSubdomainAvailability(subdomain: $subdomain) { available } }`,
			map[string]any{"subdomain": "free"}, "UNAUTHENTICATED"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := errorCode(t, h.send(t, tt.operation, tt.query, tt.variables)); got != tt.want {
				t.Errorf("%s error code = %q, want %q", tt.operation, got, tt.want)
			}
		})
	}
}

func TestSubdomainAvailability(t *testing.T) {
	t.Parallel()
	h := newHarness(t, &auth.Principal{UserID: memberUserID})
	const query = `query CheckWorkspaceSubdomainAvailability($subdomain: String!) { checkWorkspaceSubdomainAvailability(subdomain: $subdomain) { isValid available suggestedSubdomain suggestedSubdomains } }`

	tests := []struct {
		name      string
		subdomain string
		want      map[string]any
	}{
		{"free", "fresh", map[string]any{"isValid": true, "available": true, "suggestedSubdomain": "fresh", "suggestedSubdomains": []any{"fresh"}}},
		{"invalid name slugified into suggestions", "Acme Corp!", map[string]any{"isValid": false, "available": false, "suggestedSubdomain": "acme-corp", "suggestedSubdomains": []any{"acme-corp", "acme-corp-2", "acme-corp-3"}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := h.data(t, "CheckWorkspaceSubdomainAvailability", query, map[string]any{"subdomain": tt.subdomain})["checkWorkspaceSubdomainAvailability"]
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("availability of %q (-want +got):\n%s", tt.subdomain, diff)
			}
		})
	}
}

func TestCreationDefaults_personalEmailGetsNoDefaults(t *testing.T) {
	t.Parallel()
	h := newHarness(t, &auth.Principal{UserID: personalUserID})
	got := h.data(t, "GetWorkspaceCreationDefaults", `query GetWorkspaceCreationDefaults { getWorkspaceCreationDefaults { displayName subdomain } }`, nil)["getWorkspaceCreationDefaults"]
	want := map[string]any{"displayName": "", "subdomain": ""}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("getWorkspaceCreationDefaults (-want +got):\n%s", diff)
	}
}
