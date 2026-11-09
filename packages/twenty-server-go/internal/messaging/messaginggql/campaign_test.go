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
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/messaginggql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	campaignID    = "7b0e8c1a-1f3a-4d6e-8b8e-2f5c4a9d0e11"
	listID        = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f"
	audienceAda   = "a1111111-1111-4111-8111-111111111111"
	audienceBob   = "b2222222-2222-4222-8222-222222222222"
	audienceCarol = "c3333333-3333-4333-8333-333333333333"

	campaignBody = `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{name.firstName}}"}]}]}`
)

type campaignHarness struct {
	handler http.Handler
	pool    *pgxpool.Pool
	mailer  *fakeMailer
	queued  *[]river.JobArgs
}

func (h campaignHarness) queue(_ context.Context, args river.JobArgs) error {
	*h.queued = append(*h.queued, args)
	return nil
}

func newCampaignHarness(t *testing.T, status string) campaignHarness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	h := campaignHarness{pool: pool, mailer: &fakeMailer{}, queued: &[]river.JobArgs{}}
	graphql := messaginggql.NewHandler(&messaginggql.Resolver{
		Mailer: h.mailer, Campaigns: store.NewCampaigns(pool), Renderer: messaging.GoRenderer{}, Queue: h.queue,
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h.handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{UserWorkspaceID: userWorkspaceID})))
	})

	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		`INSERT INTO core."connectedAccount" (id, "workspaceId", handle, provider, "userWorkspaceId")
			VALUES ('` + accountID + `', gen_random_uuid(), 'me@example.com', 'google', '` + userWorkspaceID + `')`,
		`INSERT INTO ` + schema + `.person (id, "emailsPrimaryEmail", "nameFirstName") VALUES ('` + audienceAda + `', 'Ada@Example.com', 'Ada')`,
		`INSERT INTO ` + schema + `.person (id, "emailsPrimaryEmail") VALUES ('` + audienceBob + `', 'bob@example.com')`,
		`INSERT INTO ` + schema + `.person (id) VALUES ('` + audienceCarol + `')`,
		`INSERT INTO ` + schema + `."messageList" (id, name) VALUES ('` + listID + `', 'Launch')`,
		`INSERT INTO ` + schema + `."messageListMember" ("listId", "personId") VALUES ('` + listID + `', '` + audienceAda + `'), ('` + listID + `', '` + audienceBob + `'), ('` + listID + `', '` + audienceCarol + `')`,
		`INSERT INTO ` + schema + `."messageSuppression" ("emailAddress", reason, source) VALUES ('bob@example.com', 'UNSUBSCRIBE', 'MANUAL')`,
		`INSERT INTO ` + schema + `."messageCampaign" (id, name, subject, "bodyTemplate", "fromAddressPrimaryEmail", status, "listId")
			VALUES ('` + campaignID + `', 'Launch', 'Hello', '` + campaignBody + `', 'me@example.com', '` + status + `', '` + listID + `')`,
	}
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if status == "SENDING" {
		if _, err := tx.Exec(t.Context(), `INSERT INTO `+schema+`."campaignDelivery" ("campaignId", "personId", "recipientEmail")
			VALUES ('`+campaignID+`', '`+audienceAda+`', 'ada@example.com'), ('`+campaignID+`', '`+audienceBob+`', 'bob@example.com')`); err != nil {
			t.Fatalf("seed deliveries: %v", err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return h
}

func (h campaignHarness) execute(t *testing.T, query string, input map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": map[string]any{"input": input}})
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

func (h campaignHarness) scalar(t *testing.T, query string, args ...any) string {
	t.Helper()
	var value string
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&value); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return value
}

const (
	sendCampaignMutation   = `mutation SendMessageCampaign($input: SendMessageCampaignInput!) { sendMessageCampaign(input: $input) { campaignId queuedCount } }`
	cancelCampaignMutation = `mutation CancelMessageCampaign($input: CancelMessageCampaignInput!) { cancelMessageCampaign(input: $input) { campaignId canceledMessageCount } }`
)

func campaignErrorCode(decoded map[string]any) any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
}

func TestCampaignOperations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, status string }{
		{"PreviewMessageCampaignAudience", "DRAFT"},
		{"SendMessageCampaign", "DRAFT"},
		{"SendMessageCampaignTest", "DRAFT"},
		{"CancelMessageCampaign", "SENDING"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newCampaignHarness(t, tt.status)
			golden.Assert(t, h.handler, "testdata", tt.name, "data.sendMessageCampaignTest.messageId")
		})
	}
}

func TestSendMessageCampaign_deliversThroughRiverJobs(t *testing.T) {
	t.Parallel()
	h := newCampaignHarness(t, "DRAFT")

	decoded := h.execute(t, sendCampaignMutation, map[string]any{"campaignId": campaignID})
	if decoded["errors"] != nil {
		t.Fatalf("sendMessageCampaign errors: %v", decoded["errors"])
	}
	wantJobs := []river.JobArgs{messaging.SendCampaignArgs{CampaignID: campaignID}}
	if diff := cmp.Diff(wantJobs, *h.queued); diff != "" {
		t.Fatalf("queued jobs (-want +got):\n%s", diff)
	}

	var deliveries []river.JobArgs
	campaigns := &messaging.Campaigns{
		Store: store.NewCampaigns(h.pool), Renderer: messaging.GoRenderer{}, Mailer: h.mailer,
		Queue: func(_ context.Context, args river.JobArgs) error { deliveries = append(deliveries, args); return nil },
	}
	if err := campaigns.Send(t.Context(), campaignID); err != nil {
		t.Fatalf("Send: %v", err)
	}
	for _, args := range deliveries {
		if err := campaigns.Deliver(t.Context(), args.(messaging.DeliverCampaignMessageArgs).DeliveryID, false); err != nil {
			t.Fatalf("Deliver: %v", err)
		}
	}

	if len(h.mailer.sent) != 1 {
		t.Fatalf("mailer sent %d emails, want one", len(h.mailer.sent))
	}
	sent := h.mailer.sent[0]
	if diff := cmp.Diff([]string{"ada@example.com"}, sent.To); diff != "" || sent.Subject != "Hello" || !strings.Contains(sent.HTMLBody, "Hi Ada") {
		t.Errorf("sent %+v, want Hello to ada@example.com rendered with her first name", sent)
	}
	if status := h.scalar(t, `SELECT status::text FROM `+schema+`."messageCampaign" WHERE id = $1`, campaignID); status != "SENT" {
		t.Errorf("campaign status = %q, want SENT", status)
	}
}

func TestCancelMessageCampaign_stopsPendingDeliveries(t *testing.T) {
	t.Parallel()
	h := newCampaignHarness(t, "DRAFT")
	h.execute(t, sendCampaignMutation, map[string]any{"campaignId": campaignID})
	var deliveries []river.JobArgs
	campaigns := &messaging.Campaigns{
		Store: store.NewCampaigns(h.pool), Renderer: messaging.GoRenderer{}, Mailer: h.mailer,
		Queue: func(_ context.Context, args river.JobArgs) error { deliveries = append(deliveries, args); return nil },
	}
	if err := campaigns.Send(t.Context(), campaignID); err != nil {
		t.Fatalf("Send: %v", err)
	}

	decoded := h.execute(t, cancelCampaignMutation, map[string]any{"campaignId": campaignID})
	if decoded["errors"] != nil {
		t.Fatalf("cancelMessageCampaign errors: %v", decoded["errors"])
	}
	for _, args := range deliveries {
		if err := campaigns.Deliver(t.Context(), args.(messaging.DeliverCampaignMessageArgs).DeliveryID, false); err != nil {
			t.Fatalf("Deliver: %v", err)
		}
	}

	if len(h.mailer.sent) != 0 {
		t.Errorf("mailer sent %d emails after cancel, want none", len(h.mailer.sent))
	}
	if status := h.scalar(t, `SELECT status::text FROM `+schema+`."messageCampaign" WHERE id = $1`, campaignID); status != "CANCELED" {
		t.Errorf("campaign status = %q, want CANCELED", status)
	}
}

func TestCampaignOperations_rejects(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, status, query string
		input               map[string]any
		wantCode            string
	}{
		{"scheduled send", "DRAFT", sendCampaignMutation, map[string]any{"campaignId": campaignID, "scheduledAt": "2030-01-01T00:00:00.000Z"}, "BAD_USER_INPUT"},
		{"already sending", "SENDING", sendCampaignMutation, map[string]any{"campaignId": campaignID}, "BAD_USER_INPUT"},
		{"unknown campaign", "DRAFT", sendCampaignMutation, map[string]any{"campaignId": "00000000-0000-4000-8000-000000000000"}, "NOT_FOUND"},
		{"campaign id not a uuid", "DRAFT", cancelCampaignMutation, map[string]any{"campaignId": "nope"}, "BAD_USER_INPUT"},
		{"draft is not cancelable", "DRAFT", cancelCampaignMutation, map[string]any{"campaignId": campaignID}, "BAD_USER_INPUT"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newCampaignHarness(t, tt.status)
			if code := campaignErrorCode(h.execute(t, tt.query, tt.input)); code != tt.wantCode {
				t.Errorf("error code = %v, want %s", code, tt.wantCode)
			}
			if len(*h.queued) != 0 {
				t.Errorf("queued %d jobs, want none", len(*h.queued))
			}
		})
	}
}
