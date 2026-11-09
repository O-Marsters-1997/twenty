package messaginggql_test

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"testing"

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
	userID                  = "0a000000-0000-4000-8000-000000000001"
	timelineUserWorkspaceID = "0a000000-0000-4000-8000-000000000002"
	memberID                = "0a000000-0000-4000-8000-000000000003"
	otherAccountID          = "0a000000-0000-4000-8000-000000000004"
	ownAccountID            = "0a000000-0000-4000-8000-000000000005"
	companyID               = "0c000000-0000-4000-8000-000000000001"
	opportunityID           = "0e000000-0000-4000-8000-000000000001"
	adaID                   = "0b000000-0000-4000-8000-000000000001"
	bobID                   = "0b000000-0000-4000-8000-000000000002"
)

var principal = auth.Principal{
	UserID: userID, WorkspaceID: workspace.PinnedWorkspaceID, UserWorkspaceID: timelineUserWorkspaceID, WorkspaceMemberID: memberID,
}

func seedTimeline(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	conn, err := pool.Acquire(t.Context())
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	defer conn.Release()
	s := workspace.SchemaName()
	statements := []string{
		`SET session_replication_role = replica`,
		fmt.Sprintf(`INSERT INTO %s."company" (id, name) VALUES ('%s', 'Analytical Engines')`, s, companyID),
		fmt.Sprintf(`INSERT INTO %s."person" (id, "nameFirstName", "nameLastName", "avatarUrl", "companyId") VALUES
			('%s', 'Ada', 'Lovelace', 'https://img/ada.png', '%s'), ('%s', 'Bob', 'Babbage', '', '%s')`, s, adaID, companyID, bobID, companyID),
		fmt.Sprintf(`INSERT INTO %s."opportunity" (id, name, "companyId", "pointOfContactId") VALUES ('%s', 'Engine deal', '%s', '%s')`, s, opportunityID, companyID, adaID),
		fmt.Sprintf(`INSERT INTO %s."workspaceMember" (id, "userId", "nameFirstName", "nameLastName", "avatarUrl") VALUES ('%s', '%s', 'Olly', 'Owner', 'https://img/olly.png')`, s, memberID, userID),
		`INSERT INTO core."connectedAccount" (id, "workspaceId", handle, provider, "userWorkspaceId") VALUES
			('` + otherAccountID + `', '` + workspace.PinnedWorkspaceID + `', 'other@x.com', 'google', gen_random_uuid()),
			('` + ownAccountID + `', '` + workspace.PinnedWorkspaceID + `', 'olly@x.com', 'google', '` + timelineUserWorkspaceID + `')`,
		`INSERT INTO core."messageChannel" (id, "workspaceId", visibility, handle, type, "pendingGroupEmailsAction", "syncStage", "connectedAccountId") VALUES
			('0d000000-0000-4000-8000-000000000001', '` + workspace.PinnedWorkspaceID + `', 'SUBJECT', 'other@x.com', 'EMAIL', 'NONE', 'PENDING_CONFIGURATION', '` + otherAccountID + `'),
			('0d000000-0000-4000-8000-000000000002', '` + workspace.PinnedWorkspaceID + `', 'METADATA', 'olly@x.com', 'EMAIL', 'NONE', 'PENDING_CONFIGURATION', '` + ownAccountID + `')`,
		fmt.Sprintf(`INSERT INTO %[1]s."messageThread" (id, subject) VALUES ('01000000-0000-4000-8000-000000000001', 'Hello'), ('01000000-0000-4000-8000-000000000002', 'Quote')`, s),
		fmt.Sprintf(`INSERT INTO %s."message" (id, subject, text, "receivedAt", "isDraft", "messageThreadId") VALUES
			('02000000-0000-4000-8000-000000000001', 'Hello', 'first', '2024-01-01T10:00:00Z', false, '01000000-0000-4000-8000-000000000001'),
			('02000000-0000-4000-8000-000000000002', 'Re: Hello', 'second', '2024-01-02T10:00:00Z', false, '01000000-0000-4000-8000-000000000001'),
			('02000000-0000-4000-8000-000000000003', 'Quote', 'price', '2024-01-03T10:00:00Z', true, '01000000-0000-4000-8000-000000000002')`, s),
		fmt.Sprintf(`INSERT INTO %s."messageParticipant" (role, handle, "displayName", "personId", "workspaceMemberId", "messageId") VALUES
			('FROM', 'ada@x.com', 'ada@x.com', '%s', NULL, '02000000-0000-4000-8000-000000000001'),
			('TO', 'olly@x.com', 'olly@x.com', NULL, '%s', '02000000-0000-4000-8000-000000000001'),
			('FROM', 'olly@x.com', 'olly@x.com', NULL, '%s', '02000000-0000-4000-8000-000000000002'),
			('FROM', 'bob@x.com', 'Bob B', '%s', NULL, '02000000-0000-4000-8000-000000000003')`, s, adaID, memberID, memberID, bobID),
		fmt.Sprintf(`INSERT INTO %s."messageChannelMessageAssociation" ("messageId", "messageChannelId", "messageThreadId") VALUES
			('02000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001', '01000000-0000-4000-8000-000000000001'),
			('02000000-0000-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000002', '01000000-0000-4000-8000-000000000002')`, s),
		fmt.Sprintf(`INSERT INTO %s."messageThreadTarget" ("messageThreadId", "targetPersonId", "targetCompanyId", "targetOpportunityId") VALUES
			('01000000-0000-4000-8000-000000000001', '%s', '%s', '%s'),
			('01000000-0000-4000-8000-000000000002', '%s', '%s', NULL)`, s, adaID, companyID, opportunityID, bobID, companyID),
	}
	for _, statement := range statements {
		if _, err := conn.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
}

func newHandler(t *testing.T) (http.Handler, *pgxpool.Pool) {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	seedTimeline(t, pool)
	inner := messaginggql.NewHandler(&messaginggql.Resolver{
		Timeline: store.NewTimeline(pool), Banners: store.NewReconnectBanners(pool),
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inner.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	}), pool
}

func TestHandler_MatchesGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{
		"get-timeline-threads-from-object-record-person",
		"get-timeline-threads-from-object-record-company",
		"get-timeline-threads-from-object-record-opportunity",
		"get-timeline-threads-from-object-record-second-page",
		"get-timeline-threads-from-person-id",
		"get-timeline-threads-from-company-id",
		"get-timeline-threads-from-opportunity-id",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			handler, _ := newHandler(t)
			golden.Assert(t, handler, "testdata/golden", name)
		})
	}
}

func TestDismissReconnectAccountBanner(t *testing.T) {
	t.Parallel()
	handler, pool := newHandler(t)
	const key = "ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS"
	lists := map[string]string{
		key:                                   `["` + otherAccountID + `","` + ownAccountID + `"]`,
		"ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES": `["` + otherAccountID + `"]`,
	}
	for listKey, value := range lists {
		if _, err := pool.Exec(t.Context(), `INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value, type) VALUES ($1, $2, $3, $4::jsonb, 'USER_VARIABLE')`,
			userID, workspace.PinnedWorkspaceID, listKey, value); err != nil {
			t.Fatalf("seed reconnect list: %v", err)
		}
	}
	golden.Assert(t, handler, "testdata/golden", "dismiss-reconnect-account-banner")

	values := map[string]string{}
	rows, err := pool.Query(t.Context(), `SELECT key, value::text FROM core."keyValuePair" WHERE "userId" = $1`, userID)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			t.Fatal(err)
		}
		values[k] = v
	}
	if want := `["` + ownAccountID + `"]`; values[key] != want {
		t.Errorf("%s = %q, want %q", key, values[key], want)
	}
	if v, kept := values["ACCOUNTS_TO_RECONNECT_EMAIL_ALIASES"]; kept {
		t.Errorf("emptied list kept as %q, want it deleted", v)
	}
}

func TestTimeline_ThreadsForRecord_rejectsBadPaging(t *testing.T) {
	t.Parallel()
	_, pool := newHandler(t)
	timeline := store.NewTimeline(pool)
	for _, tt := range []struct {
		name           string
		page, pageSize int
	}{{"page size over the maximum", 1, messaging.TimelineThreadsMaxPageSize + 1}, {"page zero", 0, 20}} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := timeline.ThreadsForRecord(t.Context(), timelineUserWorkspaceID, "person", adaID, tt.page, tt.pageSize)
			if !errors.Is(err, messaging.ErrInvalidTimelinePage) {
				t.Errorf("ThreadsForRecord(page %d, size %d) error = %v, want ErrInvalidTimelinePage", tt.page, tt.pageSize, err)
			}
		})
	}
}
