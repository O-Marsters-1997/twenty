package messaginggql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/messaginggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	domainWorkspaceID = "20202020-1c25-4d02-bf25-6aeccf7ea419"
	otherWorkspaceID  = "20202020-0000-4000-8000-000000000002"
	adminUserWS       = "c1000000-0000-4000-8000-000000000001"
	flaggedUserWS     = "c1000000-0000-4000-8000-000000000002"
	memberUserWS      = "c1000000-0000-4000-8000-000000000003"
	adminRoleID       = "d0000000-0000-4000-8000-000000000001"
	flaggedRoleID     = "d0000000-0000-4000-8000-000000000002"
	memberRoleID      = "d0000000-0000-4000-8000-000000000003"
	dmarcPolicy       = "v=DMARC1; p=reject"
)

func fakeDNS(_ context.Context, name string) ([]string, error) {
	if name == "_dmarc.example.org" {
		return []string{dmarcPolicy}, nil
	}
	return nil, &net.DNSError{Err: "no such host", Name: name, IsNotFound: true}
}

func failingDNS(_ context.Context, name string) ([]string, error) {
	return nil, &net.DNSError{Err: "server misbehaving", Name: name}
}

func newEmailingDomainHandler(t *testing.T, userWorkspaceID string, lookup store.TXTLookup) http.Handler {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core."emailingDomain" (id, domain, status, "tenantStatus", "verificationRecords", "verifiedAt", "workspaceId", "unsubscribeHostnameStatus", "createdAt", "updatedAt") VALUES
			('e1111111-1111-4111-8111-111111111111', 'mail.acme.com', 'PENDING', 'ACTIVE',
			 '[{"type":"MX","key":"mail.acme.com","value":"feedback-smtp.eu-west-1.amazonses.com","priority":10,"status":"PENDING"}]', NULL, '` + domainWorkspaceID + `', NULL, '2026-01-01', '2026-01-01'),
			('e2222222-2222-4222-8222-222222222222', 'example.org', 'VERIFIED', 'ACTIVE',
			 '[{"type":"TXT","key":"selector._domainkey.example.org","value":"v=DKIM1; p=abc","status":"SUCCESS"}]', '2026-02-02', '` + domainWorkspaceID + `', 'ACTIVE', '2026-02-01', '2026-02-02'),
			('e3333333-3333-4333-8333-333333333333', 'elsewhere.io', 'PENDING', 'ACTIVE', NULL, NULL, '` + otherWorkspaceID + `', NULL, '2026-03-01', '2026-03-01')`,
		`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + adminRoleID + `', 'Admin', true, '` + domainWorkspaceID + `', gen_random_uuid(), gen_random_uuid())`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + flaggedRoleID + `', 'Settings', '` + domainWorkspaceID + `', gen_random_uuid(), gen_random_uuid())`,
		`INSERT INTO core.role (id, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + memberRoleID + `', 'Member', '` + domainWorkspaceID + `', gen_random_uuid(), gen_random_uuid())`,
		`INSERT INTO core."permissionFlag" (id, "workspaceId", "applicationId", "universalIdentifier", key, label, "permissionType") VALUES ('e0000000-0000-4000-8000-000000000001', '` + domainWorkspaceID + `', gen_random_uuid(), gen_random_uuid(), 'WORKSPACE', 'Workspace', 'SETTINGS')`,
		`INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId") VALUES ('` + flaggedRoleID + `', '` + domainWorkspaceID + `', gen_random_uuid(), gen_random_uuid(), 'e0000000-0000-4000-8000-000000000001')`,
		roleTargetSQL(adminRoleID, adminUserWS),
		roleTargetSQL(flaggedRoleID, flaggedUserWS),
		roleTargetSQL(memberRoleID, memberUserWS),
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() {
		if err := tx.Rollback(context.Background()); err != nil && !strings.Contains(err.Error(), "tx is closed") {
			t.Errorf("rollback: %v", err)
		}
	})
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	graphql := messaginggql.NewHandler(&messaginggql.Resolver{EmailingDomains: store.NewEmailingDomains(pool, lookup)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: domainWorkspaceID, UserWorkspaceID: userWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func roleTargetSQL(roleID, userWorkspaceID string) string {
	return `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId") VALUES ('` +
		domainWorkspaceID + `', '` + roleID + `', '` + userWorkspaceID + `', gen_random_uuid(), gen_random_uuid())`
}

func queryDomains(t *testing.T, handler http.Handler, query string) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query})
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

func TestGetEmailingDomains_MatchesNodeGolden(t *testing.T) {
	t.Parallel()
	golden.Assert(t, newEmailingDomainHandler(t, adminUserWS, fakeDNS), "testdata", "GetEmailingDomains")
}

func TestGetEmailingDomains_RequiresWorkspaceSettingsPermission(t *testing.T) {
	t.Parallel()
	const query = `{ getEmailingDomains { id } }`
	member := queryDomains(t, newEmailingDomainHandler(t, memberUserWS, fakeDNS), query)
	if code := errorCode(t, member); code != "FORBIDDEN" {
		t.Errorf("member error code = %q, want FORBIDDEN", code)
	}
	flagged := queryDomains(t, newEmailingDomainHandler(t, flaggedUserWS, fakeDNS), query)
	if flagged["errors"] != nil {
		t.Errorf("WORKSPACE role errors = %v, want none", flagged["errors"])
	}
}

func TestGetEmailingDomains_OffersNoDMARCRecordWhenLookupFails(t *testing.T) {
	t.Parallel()
	response := queryDomains(t, newEmailingDomainHandler(t, adminUserWS, failingDNS), `{ getEmailingDomains { domain verificationRecords { key } } }`)
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response = %v, want data", response)
	}
	domains := data["getEmailingDomains"].([]any)
	for _, entry := range domains {
		for _, record := range entry.(map[string]any)["verificationRecords"].([]any) {
			if key := record.(map[string]any)["key"].(string); strings.HasPrefix(key, "_dmarc.") {
				t.Errorf("%v offered DMARC record %s after a failed lookup", entry.(map[string]any)["domain"], key)
			}
		}
	}
}
