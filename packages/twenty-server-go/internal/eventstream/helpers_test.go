package eventstream_test

import (
	"context"
	"io"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type noopPublisher struct{}

func (noopPublisher) Publish(context.Context, pgx.Tx, records.RecordEvent) error { return nil }

func nilLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }
