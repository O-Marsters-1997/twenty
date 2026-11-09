package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func seedChannel(t *testing.T, pool *pgxpool.Pool, accountID string) string {
	t.Helper()
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	if _, err := tx.Exec(t.Context(), `SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatalf("disable foreign keys: %v", err)
	}
	var id string
	err = tx.QueryRow(t.Context(), `INSERT INTO core."messageChannel" ("workspaceId", visibility, handle, type, "pendingGroupEmailsAction", "syncStage", "connectedAccountId")
		VALUES (gen_random_uuid(), 'METADATA', 'me@example.com', 'EMAIL', 'NONE', 'PENDING_CONFIGURATION', $1) RETURNING id::text`, accountID).Scan(&id)
	if err != nil {
		t.Fatalf("seed channel: %v", err)
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	return id
}

func TestSync_Import(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	sync := store.NewSync(pool)
	channelID := seedChannel(t, pool, seedAccount(t, pool))
	schema := `"` + workspace.SchemaName() + `".`

	ids, err := sync.ActiveChannelIDs(t.Context())
	if err != nil || len(ids) != 1 || ids[0] != channelID {
		t.Fatalf("ActiveChannelIDs() = %v, %v, want [%s]", ids, err, channelID)
	}
	if _, err := pool.Exec(t.Context(), `INSERT INTO `+schema+`blocklist (handle) VALUES ('@spam.test')`); err != nil {
		t.Fatalf("seed blocklist: %v", err)
	}
	blocked, err := sync.Blocklist(t.Context())
	if diff := cmp.Diff([]string{"@spam.test"}, blocked); err != nil || diff != "" {
		t.Errorf("Blocklist() = %v, %v (-want +got):\n%s", blocked, err, diff)
	}

	first := messaging.ImportedMessage{
		ExternalID: "m1", ThreadExternalID: "t1", Subject: "Hello", Text: "hi", From: "ann@example.com",
		To: []string{"me@example.com"}, ReceivedAt: time.Now(), Direction: "INCOMING",
	}
	reply := first
	reply.ExternalID, reply.From, reply.To, reply.Direction = "m2", "me@example.com", []string{"ann@example.com"}, "OUTGOING"
	for range 2 {
		if err := sync.Import(t.Context(), channelID, []messaging.ImportedMessage{first, reply}, "cursor-2"); err != nil {
			t.Fatalf("Import() = %v", err)
		}
	}

	count := func(query string) (n int) {
		t.Helper()
		if err := pool.QueryRow(t.Context(), query).Scan(&n); err != nil {
			t.Fatalf("%s: %v", query, err)
		}
		return n
	}
	for table, want := range map[string]int{"message": 2, "messageThread": 1, "messageChannelMessageAssociation": 2, "messageParticipant": 4} {
		if got := count(`SELECT count(*) FROM ` + schema + `"` + table + `"`); got != want {
			t.Errorf("%s rows = %d, want %d", table, got, want)
		}
	}
	channel, err := sync.Channel(t.Context(), channelID)
	if err != nil || channel.SyncCursor != "cursor-2" {
		t.Errorf("Channel() = %+v, %v, want cursor-2", channel, err)
	}
	if _, err := sync.Channel(t.Context(), "00000000-0000-0000-0000-000000000000"); err == nil {
		t.Error("Channel(missing) = nil error, want ErrChannelNotFound")
	}
}
