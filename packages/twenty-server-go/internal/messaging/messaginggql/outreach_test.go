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
	"sync"
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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	channelPrivate = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3"
	channelPending = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4"
	folderInbox    = "f0000000-0000-4000-8000-000000000001"
	folderArchive  = "f0000000-0000-4000-8000-000000000002"
	folderPrivate  = "f0000000-0000-4000-8000-000000000003"
	folderPending  = "f0000000-0000-4000-8000-000000000004"
	topicProduct   = "70000000-0000-4000-8000-000000000001"
	outreachList   = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5a"
	outreachMember = "0a000000-0000-4000-8000-0000000000a1"
	outreachAda    = "0b000000-0000-4000-8000-0000000000a1"
	outreachBob    = "0b000000-0000-4000-8000-0000000000a2"
	eventKickoff   = "ec000000-0000-4000-8000-000000000001"
	eventReview    = "ec000000-0000-4000-8000-000000000002"
	eventOther     = "ec000000-0000-4000-8000-000000000003"
	googleScope    = "https://www.googleapis.com/auth/calendar.events"
)

const outreachSeed = `
INSERT INTO core."messageChannel" ("workspaceId", id, handle, type, visibility, "syncStage", "syncStatus", "pendingGroupEmailsAction", "connectedAccountId", "createdAt", "updatedAt") VALUES
 ($1, '` + channelPrivate + `', 'private@example.com', 'EMAIL', 'METADATA', 'MESSAGES_IMPORT_PENDING', 'ACTIVE', 'NONE', '` + accountPrivate + `', '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z'),
 ($1, '` + channelPending + `', 'me+new@example.com', 'EMAIL', 'METADATA', 'PENDING_CONFIGURATION', 'NOT_SYNCED', 'NONE', '` + accountMine + `', '2026-01-06T00:00:00Z', '2026-01-06T00:00:00Z');
INSERT INTO core."messageFolder" ("workspaceId", id, name, "isSentFolder", "isSynced", "externalId", "pendingSyncAction", "messageChannelId", "createdAt", "updatedAt") VALUES
 ($1, '` + folderInbox + `', 'INBOX', false, true, 'ext-inbox', 'NONE', '` + channelMine + `', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
 ($1, '` + folderArchive + `', 'Archive', false, false, 'ext-archive', 'NONE', '` + channelMine + `', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z'),
 ($1, '` + folderPrivate + `', 'Secret', false, true, NULL, 'NONE', '` + channelPrivate + `', '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z'),
 ($1, '` + folderPending + `', 'Fresh', false, true, NULL, 'NONE', '` + channelPending + `', '2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z');
INSERT INTO core."unsubscribeTopic" ("workspaceId", id, name, visibility, "createdAt", "updatedAt") VALUES
 ($1, '` + topicProduct + `', 'Product news', 'PUBLIC', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
INSERT INTO @schema."messageSuppression" (id, "emailAddress", reason, source, "unsubscribeTopicId", "createdAt") VALUES
 ('50000000-0000-4000-8000-000000000001', 'a@example.com', 'UNSUBSCRIBE', 'SYSTEM', '` + topicProduct + `', '2026-01-03T00:00:00Z'),
 ('50000000-0000-4000-8000-000000000002', 'b@example.com', 'BOUNCE', 'WEBHOOK', NULL, '2026-01-02T00:00:00Z'),
 ('50000000-0000-4000-8000-000000000003', 'c_d@example.com', 'UNSUBSCRIBE', 'SYSTEM', NULL, '2026-01-01T00:00:00Z');
INSERT INTO @schema."messageList" (id, name, description, "position") VALUES ('` + outreachList + `', 'Launch', NULL, 0);
INSERT INTO @schema."messageListMember" ("listId", "personId") VALUES ('` + outreachList + `', '` + outreachAda + `'), ('` + outreachList + `', '` + outreachBob + `');
INSERT INTO @schema.person (id, "nameFirstName", "nameLastName", "avatarUrl", "emailsPrimaryEmail") VALUES
 ('` + outreachAda + `', 'Ada', 'Lovelace', 'https://img/ada.png', 'Ada@x.com'), ('` + outreachBob + `', 'Bob', 'Babbage', '', 'bob@y.com');
INSERT INTO @schema."workspaceMember" (id, "userId", "nameFirstName", "nameLastName", "avatarUrl") VALUES ('` + outreachMember + `', gen_random_uuid(), 'Olly', 'Owner', '');
INSERT INTO @schema."calendarEvent" (id, title, "isFullDay", "startsAt", "endsAt", description, location, "conferenceSolution", "conferenceLinkPrimaryLinkLabel", "conferenceLinkPrimaryLinkUrl") VALUES
 ('` + eventKickoff + `', 'Kickoff', false, '2026-03-01T10:00:00Z', '2026-03-01T11:00:00Z', 'Agenda', 'Room 1', 'hangoutsMeet', 'Meet', 'https://meet.google.com/abc'),
 ('` + eventReview + `', 'Review', true, '2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z', '', '', '', '', ''),
 ('` + eventOther + `', 'Unrelated', false, '2026-04-01T10:00:00Z', '2026-04-01T11:00:00Z', '', '', '', '', '');
INSERT INTO @schema."calendarEventParticipant" (id, handle, "displayName", "calendarEventId", "personId", "workspaceMemberId", "createdAt") VALUES
 ('ee000000-0000-4000-8000-000000000001', 'ada@x.com', 'Ada L', '` + eventKickoff + `', '` + outreachAda + `', NULL, '2026-01-01T00:00:00Z'),
 ('ee000000-0000-4000-8000-000000000002', 'olly@x.com', 'Olly', '` + eventKickoff + `', NULL, '` + outreachMember + `', '2026-01-01T00:00:01Z'),
 ('ee000000-0000-4000-8000-000000000003', 'ada@x.com', 'Ada L', '` + eventReview + `', '` + outreachAda + `', NULL, '2026-01-01T00:00:00Z'),
 ('ee000000-0000-4000-8000-000000000004', 'zed@x.com', 'Zed', '` + eventOther + `', NULL, NULL, '2026-01-01T00:00:00Z');
INSERT INTO @schema."calendarChannelEventAssociation" ("calendarChannelId", "calendarEventId", "eventExternalId") VALUES
 ('` + calendarMine + `', '` + eventKickoff + `', 'g-kickoff'),
 ('` + calendarPrivate + `', '` + eventReview + `', 'g-review');`

type recordedCalendar struct {
	mu   sync.Mutex
	path string
	body map[string]any
}

type outreachHarness struct {
	handler  http.Handler
	pool     *pgxpool.Pool
	queued   *[]river.JobArgs
	calendar *recordedCalendar
}

type stubAccounts struct{}

func (stubAccounts) Get(context.Context, string) (messaging.ConnectedAccount, error) {
	return messaging.ConnectedAccount{ID: accountMine, Handle: "me@example.com", AccessToken: "tok", Scopes: []string{googleScope}}, nil
}
func (stubAccounts) SaveAccessToken(context.Context, string, string) error { return nil }
func (stubAccounts) MarkAuthFailed(context.Context, string) error          { return nil }

func newOutreachHarness(t *testing.T) outreachHarness {
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
	defer func() { _ = tx.Rollback(context.Background()) }()
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	for _, statement := range []string{seed, outreachSeed} {
		statement = strings.ReplaceAll(statement, "@schema", schema)
		statement = strings.ReplaceAll(statement, "$1", "'"+workspace.PinnedWorkspaceID+"'")
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit seed: %v", err)
	}

	recorded := &recordedCalendar{}
	google := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorded.mu.Lock()
		defer recorded.mu.Unlock()
		recorded.path = r.URL.RequestURI()
		_ = json.NewDecoder(r.Body).Decode(&recorded.body)
		_, _ = io.WriteString(w, `{"id":"g-evt-1","iCalUID":"ical-1@google.com","hangoutLink":"https://meet.google.com/xyz"}`)
	}))
	t.Cleanup(google.Close)

	h := outreachHarness{pool: pool, queued: &[]river.JobArgs{}, calendar: recorded}
	graphql := messaginggql.NewHandler(&messaginggql.Resolver{
		Channels:         store.NewChannels(pool, inboundDomain),
		Outreach:         store.NewOutreach(pool),
		Timeline:         store.NewTimeline(pool),
		CalendarChannels: store.NewCalendarChannels(pool),
		Calendar:         messaging.NewGoogleCalendar(stubAccounts{}, messaging.GmailConfig{APIURL: google.URL, HTTPClient: google.Client()}),
		Queue: func(_ context.Context, args river.JobArgs) error {
			*h.queued = append(*h.queued, args)
			return nil
		},
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	h.handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserWorkspaceID: userWorkspaceMe, WorkspaceMemberID: outreachMember, WorkspaceID: workspace.PinnedWorkspaceID}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
	return h
}

func (h outreachHarness) run(t *testing.T, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
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

func (h outreachHarness) scalar(t *testing.T, query string, args ...any) string {
	t.Helper()
	var value string
	if err := h.pool.QueryRow(t.Context(), query, args...).Scan(&value); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	return value
}

func TestOutreachOperations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct {
		name   string
		ignore []string
	}{
		{"MyMessageFolders", nil},
		{"UpdateMessageFolders", nil},
		{"MessageSuppressions", nil},
		{"StartChannelSync", nil},
		{"DuplicateMessageList", []string{"data.duplicateMessageList.id", "data.duplicateMessageList.createdAt", "data.duplicateMessageList.updatedAt"}},
		{"UnsubscribeTopics", nil},
		{"CreateUnsubscribeTopic", []string{"data.createUnsubscribeTopic.id"}},
		{"UpdateUnsubscribeTopic", nil},
		{"DeleteUnsubscribeTopic", nil},
		{"GetTimelineCalendarEventsFromObjectRecord", nil},
		{"CreateCalendarEvent", []string{"data.createCalendarEvent.calendarEventId"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, newOutreachHarness(t).handler, "testdata", tt.name, tt.ignore...)
		})
	}
}

func errorCodeOf(decoded map[string]any) any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	return errs[0].(map[string]any)["extensions"].(map[string]any)["code"]
}

func TestUpdateMessageFolders(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($input: UpdateMessageFoldersInput!) { updateMessageFolders(input: $input) { id pendingSyncAction } }`
	t.Run("a folder of a channel still being configured has no pending action", func(t *testing.T) {
		t.Parallel()
		h := newOutreachHarness(t)
		h.run(t, mutation, map[string]any{"input": map[string]any{"ids": []string{folderPending}, "update": map[string]any{"isSynced": false}}})
		if got := h.scalar(t, `SELECT "pendingSyncAction" FROM core."messageFolder" WHERE id = $1`, folderPending); got != "NONE" {
			t.Errorf("pendingSyncAction = %q, want NONE", got)
		}
	})
	t.Run("enabling a folder of a configured channel queues an import", func(t *testing.T) {
		t.Parallel()
		h := newOutreachHarness(t)
		h.run(t, mutation, map[string]any{"input": map[string]any{"ids": []string{folderArchive}, "update": map[string]any{"isSynced": true}}})
		if got := h.scalar(t, `SELECT "pendingSyncAction" FROM core."messageFolder" WHERE id = $1`, folderArchive); got != "FOLDER_IMPORT" {
			t.Errorf("pendingSyncAction = %q, want FOLDER_IMPORT", got)
		}
	})
	for _, tt := range []struct{ name, folder, wantCode string }{
		{"a folder of another member's private account is forbidden", folderPrivate, "FORBIDDEN"},
		{"an unknown folder is not found", missingID, "NOT_FOUND"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newOutreachHarness(t)
			decoded := h.run(t, mutation, map[string]any{"input": map[string]any{"ids": []string{folderInbox, tt.folder}, "update": map[string]any{"isSynced": false}}})
			if got := errorCodeOf(decoded); got != tt.wantCode {
				t.Errorf("error code = %v, want %s", got, tt.wantCode)
			}
			if got := h.scalar(t, `SELECT "isSynced"::text FROM core."messageFolder" WHERE id = $1`, folderInbox); got != "true" {
				t.Errorf("earlier folder isSynced = %s, want true after the rolled-back update", got)
			}
		})
	}
}

func TestStartChannelSync(t *testing.T) {
	t.Parallel()
	const mutation = `mutation($id: UUID!) { startChannelSync(connectedAccountId: $id) { success } }`
	t.Run("queues a sync for each unconfigured message channel", func(t *testing.T) {
		t.Parallel()
		h := newOutreachHarness(t)
		h.run(t, mutation, map[string]any{"id": accountMine})
		want := []river.JobArgs{messaging.SyncMessageChannelArgs{ChannelID: channelPending}}
		if diff := cmp.Diff(want, *h.queued); diff != "" {
			t.Errorf("queued jobs (-want +got):\n%s", diff)
		}
		if got := h.scalar(t, `SELECT "syncStage" FROM core."calendarChannel" WHERE id = $1`, calendarMine); got != "CALENDAR_EVENT_LIST_FETCH_PENDING" {
			t.Errorf("calendar syncStage = %q, want CALENDAR_EVENT_LIST_FETCH_PENDING", got)
		}
	})
	t.Run("rejects an account the caller cannot use", func(t *testing.T) {
		t.Parallel()
		h := newOutreachHarness(t)
		if got := errorCodeOf(h.run(t, mutation, map[string]any{"id": accountPrivate})); got != "FORBIDDEN" {
			t.Errorf("error code = %v, want FORBIDDEN", got)
		}
	})
}

func TestMessageSuppressions(t *testing.T) {
	t.Parallel()
	const query = `query($input: FindMessageSuppressionsInput!) { messageSuppressions(input: $input) { totalCount records { emailAddress } } }`
	tests := []struct {
		name  string
		input map[string]any
		want  string
	}{
		{"filters by reason", map[string]any{"reason": "BOUNCE"}, `{"records":[{"emailAddress":"b@example.com"}],"totalCount":1}`},
		{"filters by topic", map[string]any{"unsubscribeTopicId": topicProduct}, `{"records":[{"emailAddress":"a@example.com"}],"totalCount":1}`},
		{"searches literally, not as a pattern", map[string]any{"searchTerm": "c_d"}, `{"records":[{"emailAddress":"c_d@example.com"}],"totalCount":1}`},
		{"a wildcard matches nothing", map[string]any{"searchTerm": "%"}, `{"records":[],"totalCount":0}`},
		{"pages by offset", map[string]any{"limit": 1, "offset": 2}, `{"records":[{"emailAddress":"c_d@example.com"}],"totalCount":3}`},
	}
	h := newOutreachHarness(t)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			decoded := h.run(t, query, map[string]any{"input": tt.input})
			got, _ := json.Marshal(decoded["data"].(map[string]any)["messageSuppressions"])
			if diff := cmp.Diff(tt.want, string(got)); diff != "" {
				t.Errorf("messageSuppressions (-want +got):\n%s", diff)
			}
		})
	}
}

func TestUnsubscribeTopics_validateAndReport(t *testing.T) {
	t.Parallel()
	h := newOutreachHarness(t)
	create := `mutation($input: CreateUnsubscribeTopicInput!) { createUnsubscribeTopic(input: $input) { id } }`
	update := `mutation($input: UpdateUnsubscribeTopicInput!) { updateUnsubscribeTopic(input: $input) { id } }`
	remove := `mutation($id: String!) { deleteUnsubscribeTopic(id: $id) }`
	for _, tt := range []struct {
		name, query string
		variables   map[string]any
		wantCode    string
	}{
		{"create rejects a blank name", create, map[string]any{"input": map[string]any{"name": "  "}}, "BAD_USER_INPUT"},
		{"update of an unknown topic is not found", update, map[string]any{"input": map[string]any{"id": missingID, "name": "x"}}, "NOT_FOUND"},
		{"delete of an unknown topic is not found", remove, map[string]any{"id": missingID}, "NOT_FOUND"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := errorCodeOf(h.run(t, tt.query, tt.variables)); got != tt.wantCode {
				t.Errorf("error code = %v, want %s", got, tt.wantCode)
			}
		})
	}
}

func TestDuplicateMessageList_copiesMembers(t *testing.T) {
	t.Parallel()
	h := newOutreachHarness(t)
	decoded := h.run(t, `mutation($id: UUID!) { duplicateMessageList(id: $id) { id } }`, map[string]any{"id": outreachList})
	if decoded["errors"] != nil {
		t.Fatalf("duplicateMessageList errors: %v", decoded["errors"])
	}
	copyID := decoded["data"].(map[string]any)["duplicateMessageList"].(map[string]any)["id"].(string)
	if got := h.scalar(t, `SELECT count(*)::text FROM `+schema+`."messageListMember" WHERE "listId" = $1`, copyID); got != "2" {
		t.Errorf("copied members = %s, want 2", got)
	}
	if got := h.scalar(t, `SELECT count(*)::text FROM `+schema+`."messageListMember" WHERE "listId" = $1`, outreachList); got != "2" {
		t.Errorf("original members = %s, want 2", got)
	}
}

func TestCreateCalendarEvent_sendsGoogleRequestAndStoresEvent(t *testing.T) {
	t.Parallel()
	h := newOutreachHarness(t)
	input := map[string]any{
		"connectedAccountId": accountMine, "title": "Kickoff", "startsAt": "2026-03-01T10:00:00.000Z", "endsAt": "2026-03-01T11:00:00.000Z",
		"timeZone": "Europe/London", "attendees": "ada@x.com, bob@x.com", "sendInvitations": true, "addConferencing": true,
	}
	decoded := h.run(t, `mutation($input: CreateCalendarEventInput!) { createCalendarEvent(input: $input) { success calendarEventId } }`, map[string]any{"input": input})
	created := decoded["data"].(map[string]any)["createCalendarEvent"].(map[string]any)
	if created["success"] != true {
		t.Fatalf("createCalendarEvent = %v, want success", created)
	}

	h.calendar.mu.Lock()
	defer h.calendar.mu.Unlock()
	if want := "/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all"; h.calendar.path != want {
		t.Errorf("google path = %q, want %q", h.calendar.path, want)
	}
	if got := h.calendar.body["summary"]; got != "Kickoff" {
		t.Errorf("google summary = %v, want Kickoff", got)
	}
	attendees, _ := json.Marshal(h.calendar.body["attendees"])
	if want := `[{"email":"ada@x.com"},{"email":"bob@x.com"}]`; string(attendees) != want {
		t.Errorf("google attendees = %s, want %s", attendees, want)
	}
	eventID := created["calendarEventId"].(string)
	if got := h.scalar(t, `SELECT "iCalUid" FROM `+schema+`."calendarEvent" WHERE id = $1`, eventID); got != "ical-1@google.com" {
		t.Errorf("stored iCalUid = %q, want ical-1@google.com", got)
	}
	if got := h.scalar(t, `SELECT "personId"::text FROM `+schema+`."calendarEventParticipant" WHERE "calendarEventId" = $1 AND handle = 'ada@x.com'`, eventID); got != outreachAda {
		t.Errorf("participant personId = %q, want %q", got, outreachAda)
	}
}

func TestCreateCalendarEvent_rejectsAnAccountTheCallerCannotUse(t *testing.T) {
	t.Parallel()
	h := newOutreachHarness(t)
	decoded := h.run(t, `mutation($input: CreateCalendarEventInput!) { createCalendarEvent(input: $input) { success error } }`, map[string]any{"input": map[string]any{
		"connectedAccountId": accountPrivate, "title": "x", "startsAt": "2026-03-01T10:00:00Z", "endsAt": "2026-03-01T11:00:00Z",
	}})
	if got := errorCodeOf(decoded); got != "FORBIDDEN" {
		t.Errorf("error code = %v, want FORBIDDEN for an account the caller cannot use", got)
	}
}
