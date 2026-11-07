package pgtest_test

import (
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

func connect(t *testing.T, dsn string) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), dsn)
	if err != nil {
		t.Fatalf("connect %s: %v", dsn, err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func currentDatabase(t *testing.T, conn *pgxpool.Pool) string {
	t.Helper()
	var name string
	if err := conn.QueryRow(t.Context(), "SELECT current_database()").Scan(&name); err != nil {
		t.Fatalf("query current_database: %v", err)
	}
	return name
}

func databaseExists(t *testing.T, conn *pgxpool.Pool, name string) bool {
	t.Helper()
	var exists bool
	if err := conn.QueryRow(t.Context(), "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", name).Scan(&exists); err != nil {
		t.Fatalf("find database %s: %v", name, err)
	}
	return exists
}

func TestNewGivesEachTestItsOwnDatabase(t *testing.T) {
	t.Parallel()
	first := connect(t, pgtest.New(t))
	second := connect(t, pgtest.New(t))

	if _, err := first.Exec(t.Context(), "CREATE TABLE pgtest_probe (id int)"); err != nil {
		t.Fatalf("create table in first database: %v", err)
	}

	var exists bool
	if err := second.QueryRow(t.Context(), "SELECT to_regclass('pgtest_probe') IS NOT NULL").Scan(&exists); err != nil {
		t.Fatalf("look up table in second database: %v", err)
	}
	if exists {
		t.Errorf("table created in %s is visible in %s, want isolated databases", currentDatabase(t, first), currentDatabase(t, second))
	}
}

func TestNewClonesTheMigratedTemplate(t *testing.T) {
	t.Parallel()
	conn := connect(t, pgtest.New(t))

	var tables int
	if err := conn.QueryRow(t.Context(), "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables); err != nil {
		t.Fatalf("count tables: %v", err)
	}
	if tables == 0 {
		t.Errorf("public tables = 0, want the migrated schema")
	}
}

func TestDropRemovesTheDatabase(t *testing.T) {
	t.Parallel()
	observer := connect(t, pgtest.New(t))

	dsn, drop, err := pgtest.Create(t.Context())
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	conn := connect(t, dsn)
	name := currentDatabase(t, conn)

	if err := drop(); err != nil {
		t.Fatalf("drop() error = %v", err)
	}
	if databaseExists(t, observer, name) {
		t.Errorf("database %s exists after drop(), want it gone", name)
	}
}

func TestNewIsSafeInParallel(t *testing.T) {
	t.Parallel()
	const n = 20
	names := make([]string, n)
	var wg sync.WaitGroup
	for i := range n {
		wg.Go(func() {
			dsn, drop, err := pgtest.Create(t.Context())
			if err != nil {
				t.Errorf("Create() error = %v", err)
				return
			}
			defer func() {
				if err := drop(); err != nil {
					t.Errorf("drop() error = %v", err)
				}
			}()
			names[i] = dsn
		})
	}
	wg.Wait()

	seen := make(map[string]bool)
	for _, dsn := range names {
		if seen[dsn] {
			t.Errorf("Create() returned %s twice, want distinct databases", dsn)
		}
		seen[dsn] = true
	}
}

func TestDSNCarriesPoolLimit(t *testing.T) {
	t.Parallel()
	if dsn := pgtest.New(t); !strings.Contains(dsn, "pool_max_conns=") {
		t.Errorf("New() = %s, want a pool_max_conns limit", dsn)
	}
}
