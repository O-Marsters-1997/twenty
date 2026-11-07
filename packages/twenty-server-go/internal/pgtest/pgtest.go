package pgtest

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"math/rand/v2"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moby/moby/api/types/container"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

const (
	serverEnv      = "TEST_DATABASE_URL"
	startupTimeout = 2 * time.Minute
	dropTimeout    = 30 * time.Second
	idleSeconds    = 300
	staleAfter     = 5 * time.Minute
	templateLock   = 7_051_998
)

// Ryuk reaps reused containers still in use, so Postgres stops itself when idle: https://github.com/testcontainers/testcontainers-go/issues/2445
var entrypoint = fmt.Sprintf(`
(
	idle=0
	while sleep 10; do
		n=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()" 2>/dev/null) || { idle=0; continue; }
		if [ "$n" = 0 ]; then idle=$((idle + 10)); else idle=0; fi
		if [ "$idle" -ge %d ]; then kill -INT 1; fi
	done
) &
exec docker-entrypoint.sh "$@"
`, idleSeconds)

var testDatabase = regexp.MustCompile(`^pgtest_([0-9]+)_[0-9a-f]{8}$`)

type server struct {
	url      *url.URL
	admin    *pgxpool.Pool
	template string
}

var (
	once     sync.Once
	shared   *server
	startErr error
)

func New(tb testing.TB) string {
	tb.Helper()
	dsn, drop, err := Create(tb.Context())
	if err != nil {
		tb.Fatalf("pgtest: %v", err)
	}
	tb.Cleanup(func() {
		if err := drop(); err != nil {
			tb.Errorf("pgtest: %v", err)
		}
	})
	return dsn
}

func Create(ctx context.Context) (dsn string, drop func() error, err error) {
	once.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), startupTimeout)
		defer cancel()
		shared, startErr = start(ctx)
	})
	if startErr != nil {
		return "", nil, startErr
	}
	return shared.create(ctx)
}

func (s *server) create(ctx context.Context) (string, func() error, error) {
	name := fmt.Sprintf("pgtest_%d_%08x", time.Now().Unix(), rand.Uint32())
	if _, err := s.admin.Exec(ctx, "CREATE DATABASE "+ident(name)+" TEMPLATE "+ident(s.template)); err != nil {
		return "", nil, fmt.Errorf("create database %s: %w", name, err)
	}
	drop := func() error {
		ctx, cancel := context.WithTimeout(context.Background(), dropTimeout)
		defer cancel()
		if _, err := s.admin.Exec(ctx, "DROP DATABASE IF EXISTS "+ident(name)+" WITH (FORCE)"); err != nil {
			return fmt.Errorf("drop database %s: %w", name, err)
		}
		return nil
	}
	return s.dsn(name, dsnParams), drop, nil
}

func start(ctx context.Context) (*server, error) {
	if raw := os.Getenv(serverEnv); raw != "" {
		return connect(ctx, raw)
	}

	if err := os.Setenv("TESTCONTAINERS_RYUK_DISABLED", "true"); err != nil {
		return nil, fmt.Errorf("disable ryuk: %w", err)
	}
	var errs []error
	for range 2 {
		s, err := runAndConnect(ctx)
		if err == nil {
			return s, nil
		}
		errs = append(errs, err)
	}
	return nil, fmt.Errorf("start postgres (needs Docker running, or %s set to a server URL): %w", serverEnv, errors.Join(errs...))
}

func runAndConnect(ctx context.Context) (*server, error) {
	c, err := postgres.Run(ctx, image,
		testcontainers.WithReuseByName(containerName),
		testcontainers.WithEntrypoint("sh", "-c", entrypoint, "pgtest"),
		testcontainers.WithCmd("postgres", "-c", "fsync=off", "-c", "max_connections=500"),
		testcontainers.WithTmpfs(map[string]string{"/var/lib/postgresql/data": "rw"}),
		testcontainers.WithHostConfigModifier(func(hc *container.HostConfig) { hc.AutoRemove = true }),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, fmt.Errorf("run container %s: %w", containerName, err)
	}
	raw, err := c.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return nil, fmt.Errorf("connection string: %w", err)
	}
	return connect(ctx, raw)
}

func connect(ctx context.Context, raw string) (*server, error) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") {
		return nil, fmt.Errorf("%s must be a postgres:// URL", serverEnv)
	}
	cfg, err := pgxpool.ParseConfig(raw)
	if err != nil {
		return nil, fmt.Errorf("parse server url: %w", err)
	}
	cfg.MaxConns = 1
	admin, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect admin: %w", err)
	}

	s := &server{url: u, admin: admin}
	if err := s.prepare(ctx); err != nil {
		admin.Close()
		return nil, err
	}
	return s, nil
}

func (s *server) prepare(ctx context.Context) error {
	if err := s.ping(ctx); err != nil {
		return err
	}
	if err := s.sweep(ctx, time.Now()); err != nil {
		return err
	}
	template, err := s.ensureTemplate(ctx)
	if err != nil {
		return err
	}
	s.template = template
	return nil
}

// A reused container can pass the log wait before accepting connections: https://github.com/testcontainers/testcontainers-go/issues/3671
func (s *server) ping(ctx context.Context) error {
	for {
		_, err := s.admin.Exec(ctx, "SELECT 1")
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("ping server: %w", err)
		case <-time.After(200 * time.Millisecond):
		}
	}
}

func (s *server) sweep(ctx context.Context, now time.Time) error {
	rows, err := s.admin.Query(ctx, `
		SELECT datname FROM pg_database d
		WHERE datname LIKE 'pgtest\_%'
		AND NOT EXISTS (SELECT 1 FROM pg_stat_activity a WHERE a.datname = d.datname)
	`)
	if err != nil {
		return fmt.Errorf("list databases: %w", err)
	}
	names, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return fmt.Errorf("list databases: %w", err)
	}

	for _, name := range names {
		m := testDatabase.FindStringSubmatch(name)
		if m == nil {
			continue
		}
		created, err := strconv.ParseInt(m[1], 10, 64)
		if err != nil || now.Sub(time.Unix(created, 0)) < staleAfter {
			continue
		}
		if _, err := s.admin.Exec(ctx, "DROP DATABASE IF EXISTS "+ident(name)+" WITH (FORCE)"); err != nil {
			return fmt.Errorf("drop stale database %s: %w", name, err)
		}
	}
	return nil
}

func (s *server) ensureTemplate(ctx context.Context) (template string, err error) {
	hash, err := hashFS(migrationFiles)
	if err != nil {
		return "", err
	}
	template = "pgtest_tpl_" + hash

	conn, err := s.admin.Acquire(ctx)
	if err != nil {
		return "", fmt.Errorf("acquire admin connection: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", templateLock); err != nil {
		return "", fmt.Errorf("lock template: %w", err)
	}
	defer func() {
		if _, uerr := conn.Exec(context.WithoutCancel(ctx), "SELECT pg_advisory_unlock($1)", templateLock); uerr != nil {
			err = errors.Join(err, fmt.Errorf("unlock template: %w", uerr))
		}
	}()

	var exists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", template).Scan(&exists); err != nil {
		return "", fmt.Errorf("find template: %w", err)
	}
	if exists {
		return template, nil
	}

	build := template + "_build"
	if _, err := conn.Exec(ctx, "DROP DATABASE IF EXISTS "+ident(build)+" WITH (FORCE)"); err != nil {
		return "", fmt.Errorf("drop stale template build: %w", err)
	}
	if _, err := conn.Exec(ctx, "CREATE DATABASE "+ident(build)); err != nil {
		return "", fmt.Errorf("create template: %w", err)
	}
	if err := migrate(ctx, s.dsn(build, nil)); err != nil {
		return "", fmt.Errorf("migrate template: %w", err)
	}
	if _, err := conn.Exec(ctx, "ALTER DATABASE "+ident(build)+" RENAME TO "+ident(template)); err != nil {
		return "", fmt.Errorf("publish template: %w", err)
	}
	return template, nil
}

func (s *server) dsn(database string, params url.Values) string {
	u := *s.url
	u.Path = "/" + database
	q := u.Query()
	for k, v := range params {
		q[k] = v
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func hashFS(fsys fs.FS) (string, error) {
	h := sha256.New()
	err := fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		body, err := fs.ReadFile(fsys, path)
		if err != nil {
			return err
		}
		h.Write(fmt.Appendf(nil, "%s\x00%d\x00", path, len(body)))
		h.Write(body)
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("hash migrations: %w", err)
	}
	return hex.EncodeToString(h.Sum(nil))[:16], nil
}

func ident(name string) string {
	return pgx.Identifier{name}.Sanitize()
}
