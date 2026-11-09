package messaginggql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/messaginggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	userWorkspaceID = "6a1f0c2e-7b57-4a3c-9c0e-1c0f6a5b9d11"
	otherUser       = "0b8c2d44-5f0a-4f6e-8a55-2b7a8d1f3e22"
	accountID       = "3f6f1c0e-2d34-4c1a-9a55-7d1b6a0c8e01"
)

var schema = pgx.Identifier{workspace.SchemaName()}.Sanitize()

type fakeMailer struct {
	err       error
	sent      []messaging.OutboundEmail
	draftSent []string
}

func (f *fakeMailer) Send(_ context.Context, _ string, email messaging.OutboundEmail) (string, error) {
	f.sent = append(f.sent, email)
	return "gmail-1", f.err
}

func (f *fakeMailer) Draft(context.Context, string, messaging.OutboundEmail) (string, error) {
	return "", nil
}

func (f *fakeMailer) SendDraft(_ context.Context, _, draftID string, email messaging.OutboundEmail) (string, error) {
	f.sent = append(f.sent, email)
	f.draftSent = append(f.draftSent, draftID)
	return "gmail-2", f.err
}

type harness struct {
	handler http.Handler
	pool    *pgxpool.Pool
	mailer  *fakeMailer
	account string
	channel string
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	mailer := &fakeMailer{}
	graphql := messaginggql.NewHandler(&messaginggql.Resolver{Mailer: mailer, Sent: store.NewSent(pool)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserWorkspaceID: userWorkspaceID})))
	})
	h := harness{handler: handler, pool: pool, mailer: mailer}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	h.account = accountID
	if _, err := tx.Exec(t.Context(), `INSERT INTO core."connectedAccount" (id, "workspaceId", handle, provider, "userWorkspaceId")
		VALUES ($2, gen_random_uuid(), 'me@example.com', 'google', $1)`, userWorkspaceID, accountID); err != nil {
		t.Fatalf("seed account: %v", err)
	}
	if err := tx.QueryRow(t.Context(), `INSERT INTO core."messageChannel" ("workspaceId", visibility, handle, type, "pendingGroupEmailsAction", "syncStage", "connectedAccountId")
		VALUES (gen_random_uuid(), 'SHARE_EVERYTHING', 'me@example.com', 'EMAIL', 'NONE', 'PENDING_CONFIGURATION', $1) RETURNING id::text`, h.account).Scan(&h.channel); err != nil {
		t.Fatalf("seed channel: %v", err)
	}
	if _, err := tx.Exec(t.Context(), `INSERT INTO `+schema+`.person ("emailsPrimaryEmail") VALUES ('Ada@Example.com')`); err != nil {
		t.Fatalf("seed person: %v", err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return h
}

const sendMutation = `mutation SendEmail($input: SendEmailInput!) { sendEmail(input: $input) { success error messageThreadId } }`

func (h harness) send(t *testing.T, input map[string]any) map[string]any {
	t.Helper()
	decoded := h.execute(t, input)
	if errs, bad := decoded["errors"]; bad {
		t.Fatalf("SendEmail returned errors: %v", errs)
	}
	return decoded["data"].(map[string]any)
}

func (h harness) execute(t *testing.T, input map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": "SendEmail", "query": sendMutation, "variables": map[string]any{"input": input}})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	h.handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return decoded
}

func (h harness) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var n int
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&n); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return n
}

func TestSendEmail_matchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	golden.Assert(t, h.handler, "testdata", "SendEmail")
}

func TestSendEmail_failedAccountMatchesNodeGolden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.mailer.err = messaging.ErrAccountAuthFailed
	golden.Assert(t, h.handler, "testdata", "SendEmailAuthFailed")
}

func TestSendEmail_persistsOnRecipientTimeline(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.send(t, map[string]any{"connectedAccountId": h.account, "to": "ada@example.com, bob@example.com", "subject": "Hello", "body": "<p>Hi</p>"})

	want := []messaging.OutboundEmail{{To: []string{"ada@example.com", "bob@example.com"}, Subject: "Hello", HTMLBody: "<p>Hi</p>"}}
	if diff := cmp.Diff(want, h.mailer.sent); diff != "" {
		t.Errorf("mailer sent (-want +got):\n%s", diff)
	}
	timeline := h.count(t, `SELECT count(*) FROM `+schema+`."messageParticipant" p
		JOIN `+schema+`.person ON person.id = p."personId"
		JOIN `+schema+`."messageChannelMessageAssociation" a ON a."messageId" = p."messageId" AND a.direction = 'OUTGOING' AND a."messageExternalId" = 'gmail-1'
		WHERE p.role = 'TO' AND person."emailsPrimaryEmail" = 'Ada@Example.com'`)
	if timeline != 1 {
		t.Errorf("outgoing messages on the recipient's timeline = %d, want 1", timeline)
	}
	if participants := h.count(t, `SELECT count(*) FROM `+schema+`."messageParticipant"`); participants != 3 {
		t.Errorf("participants = %d, want sender and two recipients", participants)
	}
}

func TestSendEmail_replyJoinsParentThread(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.send(t, map[string]any{"connectedAccountId": h.account, "to": "ada@example.com", "subject": "Hello", "body": "one"})
	if _, err := h.pool.Exec(t.Context(), `UPDATE `+schema+`.message SET "headerMessageId" = '<parent@mail>'`); err != nil {
		t.Fatalf("set header id: %v", err)
	}
	h.send(t, map[string]any{"connectedAccountId": h.account, "to": "ada@example.com", "subject": "Re: Hello", "body": "two", "inReplyTo": "<parent@mail>"})
	if threads := h.count(t, `SELECT count(*) FROM `+schema+`."messageThread"`); threads != 1 {
		t.Errorf("threads = %d, want the reply in the parent thread", threads)
	}
}

func TestSendEmail_sendsDraftAndRemovesIt(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	var draftMessageID, draftThreadID string
	err := h.pool.QueryRow(t.Context(), `WITH thread AS (INSERT INTO `+schema+`."messageThread" (subject) VALUES ('Draft') RETURNING id),
		message AS (INSERT INTO `+schema+`.message (subject, "isDraft", "messageThreadId") SELECT 'Draft', true, id FROM thread RETURNING id, "messageThreadId"),
		association AS (INSERT INTO `+schema+`."messageChannelMessageAssociation" ("messageExternalId", direction, "messageChannelId", "messageId", "messageThreadId")
			SELECT 'draft-ext', 'OUTGOING', $1::uuid, id, "messageThreadId" FROM message)
		SELECT id::text, "messageThreadId"::text FROM message`, h.channel).Scan(&draftMessageID, &draftThreadID)
	if err != nil {
		t.Fatalf("seed draft: %v", err)
	}

	data := h.send(t, map[string]any{"connectedAccountId": h.account, "to": "ada@example.com", "subject": "Hello", "body": "final", "draftMessageId": draftMessageID})

	if diff := cmp.Diff([]string{"draft-ext"}, h.mailer.draftSent); diff != "" {
		t.Errorf("sent drafts (-want +got):\n%s", diff)
	}
	if got := h.count(t, `SELECT count(*) FROM `+schema+`.message WHERE id = $1`, draftMessageID); got != 0 {
		t.Errorf("draft message rows = %d, want it removed", got)
	}
	if got := h.count(t, `SELECT count(*) FROM `+schema+`."messageThread" WHERE id = $1`, draftThreadID); got != 0 {
		t.Errorf("draft thread rows = %d, want it removed", got)
	}
	output := data["sendEmail"].(map[string]any)
	if output["success"] != true || output["messageThreadId"] == nil {
		t.Errorf("sendEmail = %v, want success with the sent message's thread", output)
	}
}

func TestSendEmail_rejects(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	tests := []struct {
		name      string
		input     map[string]any
		wantError string
	}{
		{"sender is not the account handle", map[string]any{"fromHandle": "other@example.com"}, "you cannot send from this address"},
		{"attachments", map[string]any{"files": []any{map[string]any{"id": "f", "name": "n"}}}, "attachments are not supported"},
		{"unknown draft", map[string]any{"draftMessageId": "00000000-0000-4000-8000-000000000000"}, "synced draft not found"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := map[string]any{"connectedAccountId": h.account, "to": "ada@example.com", "subject": "s", "body": "b"}
			for key, value := range tt.input {
				input[key] = value
			}
			output := h.send(t, input)["sendEmail"].(map[string]any)
			if output["success"] != false || output["error"] == nil || !strings.Contains(output["error"].(string), tt.wantError) {
				t.Errorf("sendEmail = %v, want failure containing %q", output, tt.wantError)
			}
		})
	}
	if len(h.mailer.sent) != 0 {
		t.Errorf("mailer sent %d emails, want none", len(h.mailer.sent))
	}
}

func TestSendEmail_foreignAccountIsForbidden(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	if _, err := h.pool.Exec(t.Context(), `UPDATE core."connectedAccount" SET "userWorkspaceId" = $1`, otherUser); err != nil {
		t.Fatalf("reassign account: %v", err)
	}
	decoded := h.execute(t, map[string]any{"connectedAccountId": h.account, "to": "ada@example.com", "subject": "s", "body": "b"})
	code := decoded["errors"].([]any)[0].(map[string]any)["extensions"].(map[string]any)["code"]
	if code != "FORBIDDEN" {
		t.Errorf("error code = %v, want FORBIDDEN", code)
	}
}
