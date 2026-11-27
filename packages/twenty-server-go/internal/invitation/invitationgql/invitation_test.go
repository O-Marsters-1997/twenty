package invitationgql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/invitationgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/invitation/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/systemmail"
)

const (
	workspaceID      = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	otherWorkspaceID = "20202020-0000-4000-8000-000000000002"
	adminWorkspaceID = "c1000000-0000-4000-8000-000000000001"
	flaggedWorkspace = "c1000000-0000-4000-8000-000000000002"
	memberWorkspace  = "c1000000-0000-4000-8000-000000000003"
	applicationID    = "c2000000-0000-4000-8000-000000000001"
	adminRoleID      = "d0000000-0000-4000-8000-000000000001"
	flaggedRoleID    = "d0000000-0000-4000-8000-000000000002"
	memberRoleID     = "d0000000-0000-4000-8000-000000000003"
	senderUserID     = "f0000000-0000-4000-8000-000000000001"
	memberUserID     = "f0000000-0000-4000-8000-000000000002"
	otherInvitation  = "a1000000-0000-4000-8000-000000000009"
	otherDomain      = "b1000000-0000-4000-8000-000000000009"
)

type harness struct {
	pool *pgxpool.Pool
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	h := &harness{pool: pool}
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core.workspace (id, subdomain, "displayName", "inviteHash", "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema", "activationStatus") VALUES ('` + workspaceID + `', 'acme', 'Acme', 'hash123', '` + applicationID + `', '` + memberRoleID + `', 'workspace_acme', 'PENDING_CREATION')`,
		`INSERT INTO core."user" (id, email, "firstName", "lastName") VALUES ('` + senderUserID + `', 'sender@example.com', 'Sam', 'Sender')`,
		`INSERT INTO core."user" (id, email) VALUES ('` + memberUserID + `', 'Member@Example.com')`,
		`INSERT INTO core."userWorkspace" ("userId", "workspaceId") VALUES ('` + memberUserID + `', '` + workspaceID + `')`,
		`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + adminRoleID + `', 'Admin', true, '` + workspaceID + `', gen_random_uuid(), '` + applicationID + `')`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + flaggedRoleID + `', 'Members', '` + workspaceID + `', gen_random_uuid(), '` + applicationID + `')`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + memberRoleID + `', 'Member', '` + workspaceID + `', gen_random_uuid(), '` + applicationID + `')`,
		`INSERT INTO core."permissionFlag" (id, "workspaceId", "applicationId", "universalIdentifier", key, label, "permissionType") VALUES ('e0000000-0000-4000-8000-000000000001', '` + workspaceID + `', '` + applicationID + `', gen_random_uuid(), 'WORKSPACE_MEMBERS', 'Members', 'SETTINGS')`,
		`INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId") VALUES ('` + flaggedRoleID + `', '` + workspaceID + `', gen_random_uuid(), '` + applicationID + `', 'e0000000-0000-4000-8000-000000000001')`,
		roleTarget(adminRoleID, adminWorkspaceID),
		roleTarget(flaggedRoleID, flaggedWorkspace),
		roleTarget(memberRoleID, memberWorkspace),
		invitationRow("a1000000-0000-4000-8000-000000000001", workspaceID, "INVITATION_TOKEN", `{"email":"ada@example.com","roleId":"`+memberRoleID+`"}`, "2030-01-01", "2026-01-01", false),
		invitationRow("a1000000-0000-4000-8000-000000000002", workspaceID, "ONBOARDING_INVITATION_TOKEN", `{"email":"bob@example.com"}`, "2030-01-02", "2026-01-02", false),
		invitationRow("a1000000-0000-4000-8000-000000000003", workspaceID, "INVITATION_TOKEN", `{"email":"gone@example.com"}`, "2030-01-03", "2026-01-03", true),
		invitationRow("a1000000-0000-4000-8000-000000000004", workspaceID, "PASSWORD_RESET_TOKEN", `{"email":"reset@example.com"}`, "2030-01-04", "2026-01-04", false),
		invitationRow(otherInvitation, otherWorkspaceID, "INVITATION_TOKEN", `{"email":"eve@other.test"}`, "2030-01-05", "2026-01-05", false),
		domainRow("b1000000-0000-4000-8000-000000000001", workspaceID, "example.com", true, "2026-01-01"),
		domainRow("b1000000-0000-4000-8000-000000000002", workspaceID, "acme.test", false, "2026-01-02"),
		domainRow(otherDomain, otherWorkspaceID, "other.test", true, "2026-01-03"),
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return h
}

func roleTarget(roleID, userWorkspaceID string) string {
	return `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId") VALUES ('` + workspaceID + `', '` + roleID + `', '` + userWorkspaceID + `', gen_random_uuid(), '` + applicationID + `')`
}

func invitationRow(id, workspace, tokenType, tokenContext, expiresAt, createdAt string, deleted bool) string {
	deletedAt := "NULL"
	if deleted {
		deletedAt = "now()"
	}
	return `INSERT INTO core."appToken" (id, "workspaceId", type, value, context, "expiresAt", "createdAt", "deletedAt") VALUES ('` + id + `', '` + workspace + `', '` + tokenType + `', 'secret', '` + tokenContext + `', '` + expiresAt + `', '` + createdAt + `', ` + deletedAt + `)`
}

func domainRow(id, workspace, domain string, validated bool, createdAt string) string {
	flag := "false"
	if validated {
		flag = "true"
	}
	return `INSERT INTO core."approvedAccessDomain" (id, "workspaceId", domain, "isValidated", "createdAt") VALUES ('` + id + `', '` + workspace + `', '` + domain + `', ` + flag + `, '` + createdAt + `')`
}

func (h *harness) handler(userWorkspaceID string) http.Handler {
	return h.handlerWith(userWorkspaceID, &recordingSender{}, auth.NewMemoryThrottle())
}

func (h *harness) handlerWith(userWorkspaceID string, mailer systemmail.Sender, throttle store.Throttle) http.Handler {
	frontURL, err := url.Parse("https://app.example.com")
	if err != nil {
		panic(err)
	}
	graphql := invitationgql.NewHandler(&invitationgql.Resolver{
		Store:   store.New(h.pool),
		Inviter: store.NewInviter(h.pool, mailer, throttle, frontURL, false),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: senderUserID, WorkspaceID: workspaceID, UserWorkspaceID: userWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h *harness) send(t *testing.T, handler http.Handler, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func (h *harness) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var count int
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&count); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return count
}

func errorCode(decoded map[string]any) any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
}

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"GetWorkspaceInvitations", "DeleteWorkspaceInvitation", "GetApprovedAccessDomains", "DeleteApprovedAccessDomain"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			golden.Assert(t, h.handler(adminWorkspaceID), "testdata", name)
		})
	}
}

func TestDeleteWorkspaceInvitation(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($id: String!) { deleteWorkspaceInvitation(appTokenId: $id) }`
	tests := []struct {
		name, id, want string
		remaining      int
	}{
		{"removes the invitation", "a1000000-0000-4000-8000-000000000002", "success", 3},
		{"leaves another workspace's invitation", otherInvitation, "error", 4},
		{"ignores tokens that are not invitations", "a1000000-0000-4000-8000-000000000004", "error", 4},
		{"reports an id that is not a uuid", "nope", "error", 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			got := h.send(t, h.handler(adminWorkspaceID), mutation, map[string]any{"id": tt.id})
			if diff := cmp.Diff(map[string]any{"data": map[string]any{"deleteWorkspaceInvitation": tt.want}}, got); diff != "" {
				t.Errorf("response (-want +got):\n%s", diff)
			}
			if n := h.count(t, `SELECT count(*) FROM core."appToken"`); n != tt.remaining+1 {
				t.Errorf("appToken rows = %d, want %d", n, tt.remaining+1)
			}
		})
	}
}

func TestDeleteApprovedAccessDomain_Rejects(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($input: DeleteApprovedAccessDomainInput!) { deleteApprovedAccessDomain(input: $input) }`
	tests := []struct{ name, id, wantCode string }{
		{"another workspace's domain", otherDomain, "FORBIDDEN"},
		{"unknown domain", "00000000-0000-4000-8000-000000000000", "FORBIDDEN"},
		{"id that is not a uuid", "nope", "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			got := h.send(t, h.handler(adminWorkspaceID), mutation, map[string]any{"input": map[string]any{"id": tt.id}})
			if code := errorCode(got); code != tt.wantCode {
				t.Errorf("error code = %v, want %s", code, tt.wantCode)
			}
			if n := h.count(t, `SELECT count(*) FROM core."approvedAccessDomain"`); n != 3 {
				t.Errorf("approvedAccessDomain rows = %d, want 3", n)
			}
		})
	}
}

func TestOperations_RequireMembersPermission(t *testing.T) {
	t.Parallel()
	queries := []struct {
		name, query string
		variables   map[string]any
	}{
		{"findWorkspaceInvitations", `{ findWorkspaceInvitations { id } }`, nil},
		{"getApprovedAccessDomains", `{ getApprovedAccessDomains { id } }`, nil},
		{"deleteWorkspaceInvitation", `mutation { deleteWorkspaceInvitation(appTokenId: "a1000000-0000-4000-8000-000000000001") }`, nil},
		{"deleteApprovedAccessDomain", `mutation { deleteApprovedAccessDomain(input: {id: "b1000000-0000-4000-8000-000000000001"}) }`, nil},
	}
	for _, tt := range queries {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			if code := errorCode(h.send(t, h.handler(memberWorkspace), tt.query, tt.variables)); code != "FORBIDDEN" {
				t.Errorf("member error code = %v, want FORBIDDEN", code)
			}
			if got := h.send(t, h.handler(flaggedWorkspace), tt.query, tt.variables); got["errors"] != nil {
				t.Errorf("WORKSPACE_MEMBERS role errors = %v, want none", got["errors"])
			}
		})
	}
}

func TestOperations_RequirePrincipal(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	graphql := invitationgql.NewHandler(&invitationgql.Resolver{Store: store.New(h.pool)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if code := errorCode(h.send(t, graphql, `{ findWorkspaceInvitations { id } }`, nil)); code != "UNAUTHENTICATED" {
		t.Errorf("error code = %v, want UNAUTHENTICATED", code)
	}
}

type fakeTokens struct{}

func (fakeTokens) IssueApprovedAccessDomainToken(_ context.Context, email, workspace string, _ time.Duration) (string, error) {
	return "token|" + email + "|" + workspace, nil
}

func (fakeTokens) VerifyApprovedAccessDomainToken(_ context.Context, token string) (auth.ApprovedAccessDomainClaims, error) {
	parts := strings.Split(token, "|")
	if len(parts) != 3 || parts[0] != "token" {
		return auth.ApprovedAccessDomainClaims{}, auth.ErrInvalidApprovedAccessDomainToken
	}
	return auth.ApprovedAccessDomainClaims{Email: parts[1], WorkspaceID: parts[2]}, nil
}

type recordingSender struct {
	mu   sync.Mutex
	sent []systemmail.Message
}

func (s *recordingSender) Send(_ context.Context, message systemmail.Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sent = append(s.sent, message)
	return nil
}

func (h *harness) domainHandler(sender systemmail.Sender) http.Handler {
	graphql := invitationgql.NewHandler(&invitationgql.Resolver{
		Store:    store.New(h.pool),
		Tokens:   fakeTokens{},
		Sender:   sender,
		FrontURL: &url.URL{Scheme: "https", Host: "app.test"},
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: adminWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func TestCreateAndValidateApprovedAccessDomain_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	t.Run("CreateApprovedAccessDomain", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		golden.Assert(t, h.domainHandler(&recordingSender{}), "testdata", "CreateApprovedAccessDomain",
			"data.createApprovedAccessDomain.id", "data.createApprovedAccessDomain.createdAt")
	})
	t.Run("ValidateApprovedAccessDomain", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		golden.Assert(t, h.domainHandler(&recordingSender{}), "testdata", "ValidateApprovedAccessDomain")
	})
}

func TestCreateApprovedAccessDomain(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($input: CreateApprovedAccessDomainInput!) { createApprovedAccessDomain(input: $input) { id } }`
	t.Run("mails a validation link to the address", func(t *testing.T) {
		t.Parallel()
		h := newHarness(t)
		sender := &recordingSender{}
		got := h.send(t, h.domainHandler(sender), mutation, map[string]any{"input": map[string]any{"domain": "newco.test", "email": "ada@newco.test"}})
		if got["errors"] != nil {
			t.Fatalf("errors = %v", got["errors"])
		}
		if len(sender.sent) != 1 || sender.sent[0].To != "ada@newco.test" {
			t.Fatalf("sent = %+v, want one message to ada@newco.test", sender.sent)
		}
		for _, want := range []string{"https://app.test/settings/security?", "validationToken=token%7Cada%40newco.test%7C" + workspaceID, "wtdId="} {
			if !strings.Contains(sender.sent[0].Text, want) {
				t.Errorf("message %q missing %q", sender.sent[0].Text, want)
			}
		}
	})
	tests := []struct{ name, domain, email string }{
		{"email outside the domain", "newco.test", "ada@other.test"},
		{"public mailbox provider", "gmail.com", "ada@gmail.com"},
		{"domain already registered", "acme.test", "ada@acme.test"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			sender := &recordingSender{}
			got := h.send(t, h.domainHandler(sender), mutation, map[string]any{"input": map[string]any{"domain": tt.domain, "email": tt.email}})
			if code := errorCode(got); code != "BAD_USER_INPUT" {
				t.Errorf("error code = %v, want BAD_USER_INPUT", code)
			}
			if len(sender.sent) != 0 {
				t.Errorf("sent %d messages, want none", len(sender.sent))
			}
			if n := h.count(t, `SELECT count(*) FROM core."approvedAccessDomain"`); n != 3 {
				t.Errorf("approvedAccessDomain rows = %d, want 3", n)
			}
		})
	}
}

func TestValidateApprovedAccessDomain_Rejects(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($input: ValidateApprovedAccessDomainInput!) { validateApprovedAccessDomain(input: $input) { id } }`
	const acme = "b1000000-0000-4000-8000-000000000002"
	tests := []struct{ name, token, id, wantCode string }{
		{"token that is not signed", "garbage", acme, "FORBIDDEN"},
		{"token for another workspace", "token|ada@acme.test|" + otherWorkspaceID, acme, "FORBIDDEN"},
		{"email outside the domain", "token|ada@other.test|" + workspaceID, acme, "BAD_USER_INPUT"},
		{"another workspace's domain", "token|ada@other.test|" + workspaceID, otherDomain, "FORBIDDEN"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			got := h.send(t, h.domainHandler(&recordingSender{}), mutation, map[string]any{"input": map[string]any{"validationToken": tt.token, "approvedAccessDomainId": tt.id}})
			if code := errorCode(got); code != tt.wantCode {
				t.Errorf("error code = %v, want %s", code, tt.wantCode)
			}
			if n := h.count(t, `SELECT count(*) FROM core."approvedAccessDomain" WHERE "isValidated"`); n != 2 {
				t.Errorf("validated rows = %d, want 2", n)
			}
		})
	}
}
