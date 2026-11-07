package pgtest

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

func scratchDatabase(t *testing.T, s *server, created time.Time) string {
	t.Helper()
	name := fmt.Sprintf("pgtest_%d_%08x", created.Unix(), uint32(created.UnixNano()))
	if _, err := s.admin.Exec(t.Context(), "CREATE DATABASE "+ident(name)); err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
	t.Cleanup(func() {
		if _, err := s.admin.Exec(context.WithoutCancel(t.Context()), "DROP DATABASE IF EXISTS "+ident(name)+" WITH (FORCE)"); err != nil {
			t.Errorf("drop %s: %v", name, err)
		}
	})
	return name
}

func holdConnection(t *testing.T, s *server, database string) {
	t.Helper()
	conn, err := pgx.Connect(t.Context(), s.dsn(database, nil))
	if err != nil {
		t.Fatalf("connect %s: %v", database, err)
	}
	t.Cleanup(func() {
		if err := conn.Close(context.WithoutCancel(t.Context())); err != nil {
			t.Errorf("close %s: %v", database, err)
		}
	})
}

func TestSweep(t *testing.T) {
	New(t)
	s := shared
	now := time.Now()

	stale := scratchDatabase(t, s, now.Add(-2*staleAfter))
	fresh := scratchDatabase(t, s, now.Add(-time.Second))
	inUse := scratchDatabase(t, s, now.Add(-2*staleAfter-time.Second))
	holdConnection(t, s, inUse)

	if err := s.sweep(t.Context(), now); err != nil {
		t.Fatalf("sweep() error = %v", err)
	}

	tests := []struct {
		name     string
		database string
		want     bool
	}{
		{name: "drops an idle database past staleAfter", database: stale, want: false},
		{name: "keeps a database younger than staleAfter", database: fresh, want: true},
		{name: "keeps an old database with a connection", database: inUse, want: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got bool
			if err := s.admin.QueryRow(t.Context(), "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", tt.database).Scan(&got); err != nil {
				t.Fatalf("find %s: %v", tt.database, err)
			}
			if got != tt.want {
				t.Errorf("exists(%s) after sweep = %v, want %v", tt.database, got, tt.want)
			}
		})
	}
}
