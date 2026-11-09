package messaginggql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/messaginggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	userWorkspaceMe    = "11111111-1111-4111-8111-111111111111"
	userWorkspaceOther = "22222222-2222-4222-8222-222222222222"
	accountMine        = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
	accountShared      = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"
	accountPrivate     = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"
	accountGroup       = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4"
	accountApp         = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5"
	channelMine        = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
	channelGroup       = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"
	calendarMine       = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1"
	calendarPrivate    = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2"
	missingID          = "00000000-0000-4000-8000-000000000000"
	inboundDomain      = "in.example.com"
)

const seed = `
INSERT INTO core."connectedAccount" ("workspaceId", id, handle, provider, "accessToken", "refreshToken", scopes, "userWorkspaceId", visibility, "applicationId", "createdAt", "updatedAt") VALUES
 ($1, '` + accountMine + `', 'me@example.com', 'google', 'enc:v2:access', 'enc:v2:refresh', '{gmail.readonly}', '` + userWorkspaceMe + `', 'user', NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
 ($1, '` + accountShared + `', 'shared@example.com', 'google', NULL, NULL, NULL, '` + userWorkspaceOther + `', 'workspace', NULL, '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z'),
 ($1, '` + accountPrivate + `', 'private@example.com', 'google', NULL, NULL, NULL, '` + userWorkspaceOther + `', 'user', NULL, '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z'),
 ($1, '` + accountGroup + `', 'team@example.com', 'email_group', NULL, NULL, NULL, '` + userWorkspaceMe + `', 'workspace', NULL, '2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z'),
 ($1, '` + accountApp + `', 'app-connection', 'app', NULL, NULL, NULL, '` + userWorkspaceOther + `', 'workspace', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z');
INSERT INTO core."messageChannel" ("workspaceId", id, handle, "displayName", type, visibility, "syncStage", "syncStatus", "pendingGroupEmailsAction", "connectedAccountId", "createdAt", "updatedAt") VALUES
 ($1, '` + channelMine + `', 'me@example.com', NULL, 'EMAIL', 'SHARE_EVERYTHING', 'MESSAGES_IMPORT_PENDING', 'ACTIVE', 'NONE', '` + accountMine + `', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
 ($1, '` + channelGroup + `', 'ch_abc123abc123@` + inboundDomain + `', 'Sales', 'EMAIL_GROUP', 'SHARE_EVERYTHING', 'MESSAGE_LIST_FETCH_PENDING', 'ACTIVE', 'NONE', '` + accountGroup + `', '2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z');
INSERT INTO core."calendarChannel" ("workspaceId", id, handle, visibility, "syncStage", "connectedAccountId", "createdAt", "updatedAt") VALUES
 ($1, '` + calendarMine + `', 'me@example.com', 'METADATA', 'PENDING_CONFIGURATION', '` + accountMine + `', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
 ($1, '` + calendarPrivate + `', 'private@example.com', 'METADATA', 'PENDING_CONFIGURATION', '` + accountPrivate + `', '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z');`

type harness struct {
	handler http.Handler
	pool    *pgxpool.Pool
}

func newHarness(t *testing.T, domain string) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	if _, err := tx.Exec(t.Context(), strings.ReplaceAll(seed, "$1", "'"+workspace.PinnedWorkspaceID+"'")); err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit seed: %v", err)
	}
	inner := messaginggql.NewHandler(store.NewChannels(pool, domain), slog.New(slog.NewTextHandler(io.Discard, nil)))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := auth.WithPrincipal(r.Context(), auth.Principal{UserWorkspaceID: userWorkspaceMe})
		inner.ServeHTTP(w, r.WithContext(ctx))
	})
	return harness{handler: handler, pool: pool}
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
	h.handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.NewDecoder(recorder.Body).Decode(&decoded); err != nil {
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
	code := errs[0].(map[string]any)["extensions"].(map[string]any)["code"].(string)
	t.Logf("error %s: %v", code, errs[0].(map[string]any)["message"])
	return code
}

func (h harness) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var total int
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&total); err != nil {
		t.Fatalf("count: %v", err)
	}
	return total
}

func TestReads_matchNodeGolden(t *testing.T) {
	t.Parallel()
	handler := newHarness(t, inboundDomain).handler
	for _, name := range []string{"MyConnectedAccounts", "ApplicationConnectedAccounts", "MyMessageChannels", "MyCalendarChannels"} {
		t.Run(name, func(t *testing.T) {
			golden.Assert(t, handler, "testdata", name)
		})
	}
}

func TestMutations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct {
		name   string
		ignore []string
	}{
		{"UpdateMessageChannel", nil},
		{"CreateEmailGroupChannel", []string{
			"data.createEmailGroupChannel.messageChannel.id", "data.createEmailGroupChannel.messageChannel.handle", "data.createEmailGroupChannel.forwardingAddress",
		}},
		{"UpdateEmailGroupChannel", nil},
		{"DeleteEmailGroupChannel", nil},
		{"UpdateCalendarChannel", nil},
		{"DeleteConnectedAccount", nil},
		{"DisconnectConnectedAccount", []string{"data.disconnectConnectedAccount.archivedAt"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, newHarness(t, inboundDomain).handler, "testdata", tt.name, tt.ignore...)
		})
	}
}

func TestCreateEmailGroupChannel(t *testing.T) {
	t.Parallel()
	const mutation = `mutation CreateEmailGroupChannel($input: CreateEmailGroupChannelInput!) { createEmailGroupChannel(input: $input) { forwardingAddress } }`
	t.Run("forwards through a random address on the inbound domain", func(t *testing.T) {
		t.Parallel()
		response := newHarness(t, inboundDomain).send(t, "CreateEmailGroupChannel", mutation, map[string]any{"input": map[string]any{"handle": "support@example.com"}})
		address := response["data"].(map[string]any)["createEmailGroupChannel"].(map[string]any)["forwardingAddress"].(string)
		if !regexp.MustCompile(`^ch_[0-9a-f]{12}@in\.example\.com$`).MatchString(address) {
			t.Errorf("forwardingAddress = %q, want ch_<12 hex>@%s", address, inboundDomain)
		}
	})
	for _, tt := range []struct {
		name, domain, handle string
	}{
		{"rejects a handle that is not an email address", inboundDomain, "not-an-email"},
		{"rejects creation when no inbound domain is configured", "", "support@example.com"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			response := newHarness(t, tt.domain).send(t, "CreateEmailGroupChannel", mutation, map[string]any{"input": map[string]any{"handle": tt.handle}})
			if got := errorCode(t, response); got != "BAD_USER_INPUT" {
				t.Errorf("error code = %s, want BAD_USER_INPUT", got)
			}
		})
	}
}

func TestDeleteConnectedAccount_removesItsChannels(t *testing.T) {
	t.Parallel()
	h := newHarness(t, inboundDomain)
	h.send(t, "DeleteConnectedAccount", `mutation DeleteConnectedAccount($id: UUID!) { deleteConnectedAccount(id: $id) { id } }`, map[string]any{"id": accountMine})
	if got := h.count(t, `SELECT count(*) FROM core."messageChannel" WHERE "connectedAccountId" = $1::uuid`, accountMine); got != 0 {
		t.Errorf("message channels left = %d, want 0", got)
	}
	if got := h.count(t, `SELECT count(*) FROM core."calendarChannel" WHERE "connectedAccountId" = $1::uuid`, accountMine); got != 0 {
		t.Errorf("calendar channels left = %d, want 0", got)
	}
}

func TestDisconnectConnectedAccount_keepsChannelsButStopsSync(t *testing.T) {
	t.Parallel()
	h := newHarness(t, inboundDomain)
	h.send(t, "DisconnectConnectedAccount", `mutation DisconnectConnectedAccount($id: UUID!) { disconnectConnectedAccount(id: $id) { id } }`, map[string]any{"id": accountMine})
	if got := h.count(t, `SELECT count(*) FROM core."connectedAccount" WHERE id = $1::uuid AND "accessToken" IS NULL AND "refreshToken" IS NULL`, accountMine); got != 1 {
		t.Errorf("accounts with tokens cleared = %d, want 1", got)
	}
	if got := h.count(t, `SELECT count(*) FROM core."messageChannel" WHERE "connectedAccountId" = $1::uuid AND NOT "isSyncEnabled"`, accountMine); got != 1 {
		t.Errorf("message channels with sync off = %d, want 1", got)
	}
	if got := h.count(t, `SELECT count(*) FROM core."calendarChannel" WHERE "connectedAccountId" = $1::uuid AND NOT "isSyncEnabled"`, accountMine); got != 1 {
		t.Errorf("calendar channels with sync off = %d, want 1", got)
	}
}

func TestDeleteEmailGroupChannel_removesItsAccount(t *testing.T) {
	t.Parallel()
	h := newHarness(t, inboundDomain)
	h.send(t, "DeleteEmailGroupChannel", `mutation DeleteEmailGroupChannel($id: UUID!) { deleteEmailGroupChannel(id: $id) { id } }`, map[string]any{"id": channelGroup})
	if got := h.count(t, `SELECT count(*) FROM core."connectedAccount" WHERE id = $1::uuid`, accountGroup); got != 0 {
		t.Errorf("email group accounts left = %d, want 0", got)
	}
}

func TestMutations_rejectCallersWhoCannotAdminister(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct {
		name, query string
		variables   map[string]any
		wantCode    string
	}{
		{
			"deleting another member's private account",
			`mutation DeleteConnectedAccount($id: UUID!) { deleteConnectedAccount(id: $id) { id } }`,
			map[string]any{"id": accountPrivate}, "FORBIDDEN",
		},
		{
			"updating another member's calendar channel",
			`mutation UpdateCalendarChannel($input: UpdateCalendarChannelInput!) { updateCalendarChannel(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"id": calendarPrivate, "update": map[string]any{"isSyncEnabled": false}}}, "FORBIDDEN",
		},
		{
			"deleting an unknown account",
			`mutation DeleteConnectedAccount($id: UUID!) { deleteConnectedAccount(id: $id) { id } }`,
			map[string]any{"id": missingID}, "NOT_FOUND",
		},
		{
			"editing an email channel as an email group",
			`mutation UpdateEmailGroupChannel($input: UpdateEmailGroupChannelInput!) { updateEmailGroupChannel(input: $input) { id } }`,
			map[string]any{"input": map[string]any{"id": channelMine, "displayName": "x"}}, "BAD_USER_INPUT",
		},
		{
			"listing the channels of an account the caller cannot use",
			`query MyMessageChannels($connectedAccountId: UUID) { myMessageChannels(connectedAccountId: $connectedAccountId) { id } }`,
			map[string]any{"connectedAccountId": accountPrivate}, "FORBIDDEN",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			response := newHarness(t, inboundDomain).send(t, "", tt.query, tt.variables)
			if got := errorCode(t, response); got != tt.wantCode {
				t.Errorf("error code = %s, want %s", got, tt.wantCode)
			}
		})
	}
}
