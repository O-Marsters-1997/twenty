package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func uuidPtr(id pgtype.UUID) *string {
	if !id.Valid {
		return nil
	}
	value := id.String()
	return &value
}

func patchUUID(target *pgtype.UUID, id *string) error {
	if id == nil {
		return nil
	}
	parsed, err := optionalUUID(*id)
	if err != nil {
		return err
	}
	*target = parsed
	return nil
}

func patchText(target *pgtype.Text, value *string) {
	if value != nil {
		*target = text(*value)
	}
}

func nextPosition(ctx context.Context, pool *pgxpool.Pool, table string) (float64, error) {
	var position float64
	if err := pool.QueryRow(ctx, `SELECT COALESCE(MIN("position") - 1, 0) FROM `+table).Scan(&position); err != nil {
		return 0, fmt.Errorf("compute position: %w", err)
	}
	return position, nil
}

func timePtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	utc := value.Time.UTC()
	return &utc
}

func affect(ctx context.Context, id, label string, run func(context.Context, pgtype.UUID) (int64, error)) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}
	affected, err := run(ctx, uuid)
	if err != nil {
		return fmt.Errorf("write %s: %w", label, err)
	}
	if affected == 0 {
		return records.ErrNotFound
	}
	return nil
}
