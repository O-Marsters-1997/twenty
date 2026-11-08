package store

import (
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func TestCompiler_AggregateColumn_countsBooleans(t *testing.T) {
	t.Parallel()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	conn, err := pool.Acquire(t.Context())
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	t.Cleanup(conn.Release)
	if _, err := conn.Exec(t.Context(), `CREATE TEMP TABLE flagged ("flag" boolean); INSERT INTO flagged VALUES (true), (true), (false), (NULL)`); err != nil {
		t.Fatalf("seed: %v", err)
	}
	object := model.Object{NameSingular: "flagged", Fields: []model.Field{
		{Name: "flag", Type: model.TypeBoolean, Columns: []model.Column{{Name: "flag"}}},
	}}

	for operation, want := range map[records.AggregateOperation]int64{"countTrue": 2, "countFalse": 1} {
		t.Run(string(operation), func(t *testing.T) {
			c := &compiler{object: object}
			column, err := c.aggregateColumn(records.Aggregate{Field: "flag", Operation: operation})
			if err != nil {
				t.Fatalf("aggregateColumn(%s): %v", operation, err)
			}
			var got int64
			if err := conn.QueryRow(t.Context(), `SELECT `+column.expr+` FROM flagged`).Scan(&got); err != nil {
				t.Fatalf("SELECT %s: %v", operation, err)
			}
			if got != want {
				t.Errorf("%s = %d, want %d", column.key, got, want)
			}
		})
	}
}
