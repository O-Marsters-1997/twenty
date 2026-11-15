package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

var ErrForbidden = errors.New("forbidden")

type db interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type Input = map[string]any

type Role struct {
	ID                            string  `json:"id"`
	Label                         string  `json:"label"`
	Description                   *string `json:"description"`
	Icon                          *string `json:"icon"`
	CanUpdateAllSettings          bool    `json:"canUpdateAllSettings"`
	CanAccessAllTools             bool    `json:"canAccessAllTools"`
	IsEditable                    bool    `json:"isEditable"`
	CanReadAllObjectRecords       bool    `json:"canReadAllObjectRecords"`
	CanUpdateAllObjectRecords     bool    `json:"canUpdateAllObjectRecords"`
	CanSoftDeleteAllObjectRecords bool    `json:"canSoftDeleteAllObjectRecords"`
	CanDestroyAllObjectRecords    bool    `json:"canDestroyAllObjectRecords"`
	CanBeAssignedToUsers          bool    `json:"canBeAssignedToUsers"`
	CanBeAssignedToAgents         bool    `json:"canBeAssignedToAgents"`
	CanBeAssignedToAPIKeys        bool    `json:"canBeAssignedToApiKeys"`
}

type Webhook struct {
	ID            string   `json:"id"`
	TargetURL     string   `json:"targetUrl"`
	Operations    []string `json:"operations"`
	Description   *string  `json:"description"`
	Secret        string   `json:"secret"`
	ApplicationID string   `json:"applicationId"`
	CreatedAt     string   `json:"createdAt"`
	UpdatedAt     string   `json:"updatedAt"`
	DeletedAt     *string  `json:"deletedAt"`
}

type APIKey struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ExpiresAt string  `json:"expiresAt"`
	RevokedAt *string `json:"revokedAt"`
	CreatedAt string  `json:"createdAt"`
}

type Token struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expiresAt"`
}

func plain(input Input) Input {
	unwrapped := make(Input, len(input))
	for key, value := range input {
		switch typed := value.(type) {
		case *string:
			if typed == nil {
				unwrapped[key] = nil
			} else {
				unwrapped[key] = *typed
			}
		case []string:
			items := make([]any, len(typed))
			for i, item := range typed {
				items[i] = item
			}
			unwrapped[key] = items
		default:
			unwrapped[key] = value
		}
	}
	return unwrapped
}

func iso(column string) string {
	return `to_char(` + column + ` AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
}

func queryAll[T any](ctx context.Context, conn db, statement string, args ...any) ([]T, error) {
	rows, err := conn.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read rows: %w", err)
	}
	decoded := make([]T, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &decoded[i]); err != nil {
			return nil, fmt.Errorf("decode row: %w", err)
		}
	}
	return decoded, nil
}

func queryOne[T any](ctx context.Context, conn db, notFound string, statement string, args ...any) (T, error) {
	var zero T
	found, err := queryAll[T](ctx, conn, statement, args...)
	switch {
	case err != nil:
		return zero, err
	case len(found) == 0:
		return zero, fmt.Errorf("%w: %s", metadata.ErrNotFound, notFound)
	}
	return found[0], nil
}
