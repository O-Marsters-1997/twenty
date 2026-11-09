package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	StatusNotStarted = "NOT_STARTED"
	StatusEnqueued   = "ENQUEUED"
	StatusRunning    = "RUNNING"
	StatusStopping   = "STOPPING"
	StatusCompleted  = "COMPLETED"
	StatusFailed     = "FAILED"
	StatusStopped    = "STOPPED"
)

var (
	ErrNotFound          = errors.New("workflow row not found")
	ErrInvalidTransition = errors.New("invalid workflow run transition")
)

var transitions = map[string][]string{
	StatusNotStarted: {StatusEnqueued, StatusRunning, StatusFailed, StatusStopped},
	StatusEnqueued:   {StatusRunning, StatusFailed, StatusStopping, StatusStopped},
	StatusRunning:    {StatusCompleted, StatusFailed, StatusStopping, StatusStopped},
	StatusStopping:   {StatusCompleted, StatusFailed, StatusStopped},
}

type Workflow struct {
	ID                     string
	Name                   string
	LastPublishedVersionID string
	Statuses               []string
}

type Version struct {
	ID         string
	WorkflowID string
	Name       string
	Status     string
	Trigger    json.RawMessage
	Steps      json.RawMessage
}

type Run struct {
	ID         string
	WorkflowID string
	VersionID  string
	Name       string
	Status     string
	State      json.RawMessage
	EnqueuedAt *time.Time
	StartedAt  *time.Time
	EndedAt    *time.Time
}

type NewRun struct {
	WorkflowID string
	VersionID  string
	Name       string
	State      json.RawMessage
}

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func table(name string) string {
	return pgx.Identifier{workspace.SchemaName(), name}.Sanitize()
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (s *Store) Workflow(ctx context.Context, id string) (Workflow, error) {
	var w Workflow
	var name, published *string
	err := s.pool.QueryRow(ctx, `SELECT id::text, name, "lastPublishedVersionId", coalesce(statuses::text[], '{}')
		FROM `+table("workflow")+` WHERE id = $1 AND "deletedAt" IS NULL`, id).
		Scan(&w.ID, &name, &published, &w.Statuses)
	if err != nil {
		return Workflow{}, fmt.Errorf("select workflow: %w", notFound(err))
	}
	w.Name, w.LastPublishedVersionID = deref(name), deref(published)
	return w, nil
}

func (s *Store) Version(ctx context.Context, id string) (Version, error) {
	rows, err := s.pool.Query(ctx, versionSelect()+` AND id = $1`, id)
	if err != nil {
		return Version{}, fmt.Errorf("select version: %w", err)
	}
	version, err := pgx.CollectExactlyOneRow(rows, scanVersion)
	if err != nil {
		return Version{}, fmt.Errorf("scan version: %w", notFound(err))
	}
	return version, nil
}

func (s *Store) Versions(ctx context.Context, workflowID string) ([]Version, error) {
	rows, err := s.pool.Query(ctx, versionSelect()+` AND "workflowId" = $1 ORDER BY "createdAt", id`, workflowID)
	if err != nil {
		return nil, fmt.Errorf("select versions: %w", err)
	}
	versions, err := pgx.CollectRows(rows, scanVersion)
	if err != nil {
		return nil, fmt.Errorf("scan versions: %w", err)
	}
	return versions, nil
}

func versionSelect() string {
	return `SELECT id::text, "workflowId"::text, name, status::text, trigger, steps
		FROM ` + table("workflowVersion") + ` WHERE "deletedAt" IS NULL`
}

func scanVersion(row pgx.CollectableRow) (Version, error) {
	var v Version
	var workflowID, name *string
	err := row.Scan(&v.ID, &workflowID, &name, &v.Status, &v.Trigger, &v.Steps)
	v.WorkflowID, v.Name = deref(workflowID), deref(name)
	return v, err
}

func (s *Store) DatabaseEventVersions(ctx context.Context, eventName string) ([]Version, error) {
	rows, err := s.pool.Query(ctx, `SELECT v.id::text, v."workflowId"::text, v.name, v.status::text, v.trigger, v.steps
		FROM `+table("workflow")+` w
		JOIN `+table("workflowVersion")+` v ON v.id::text = w."lastPublishedVersionId"::text
		WHERE w."deletedAt" IS NULL AND v."deletedAt" IS NULL
			AND 'ACTIVE' = ANY(w.statuses::text[])
			AND v.trigger->>'type' = 'DATABASE_EVENT' AND v.trigger->'settings'->>'eventName' = $1
		ORDER BY v."createdAt", v.id`, eventName)
	if err != nil {
		return nil, fmt.Errorf("select database event versions: %w", err)
	}
	versions, err := pgx.CollectRows(rows, scanVersion)
	if err != nil {
		return nil, fmt.Errorf("scan database event versions: %w", err)
	}
	return versions, nil
}

func (s *Store) CreateRun(ctx context.Context, run NewRun) (Run, error) {
	return createRun(ctx, s.pool, run)
}

func (s *Store) CreateRunTx(ctx context.Context, tx pgx.Tx, run NewRun) (Run, error) {
	return createRun(ctx, tx, run)
}

func createRun(ctx context.Context, db interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, run NewRun) (Run, error) {
	rows, err := db.Query(ctx, `INSERT INTO `+table("workflowRun")+` ("workflowId", "workflowVersionId", name, state)
		VALUES ($1, $2, $3, $4) RETURNING `+runColumns, run.WorkflowID, run.VersionID, nullable(run.Name), run.State)
	if err != nil {
		return Run{}, fmt.Errorf("insert run: %w", err)
	}
	return collectRun(rows, "insert run")
}

func (s *Store) Run(ctx context.Context, id string) (Run, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+runColumns+` FROM `+table("workflowRun")+` WHERE id = $1 AND "deletedAt" IS NULL`, id)
	if err != nil {
		return Run{}, fmt.Errorf("select run: %w", err)
	}
	return collectRun(rows, "select run")
}

func (s *Store) Transition(ctx context.Context, id, status, runError string) (Run, error) {
	var run Run
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var current string
		err := tx.QueryRow(ctx, `SELECT status::text FROM `+table("workflowRun")+` WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`, id).Scan(&current)
		if err != nil {
			return fmt.Errorf("lock run: %w", notFound(err))
		}
		if !slices.Contains(transitions[current], status) {
			return fmt.Errorf("%s to %s: %w", current, status, ErrInvalidTransition)
		}
		rows, err := tx.Query(ctx, `UPDATE `+table("workflowRun")+` SET status = $2::text::`+table("workflowRun_status_enum")+`,
				"updatedAt" = now(),
				"enqueuedAt" = CASE WHEN $2::text = 'ENQUEUED' THEN now() ELSE "enqueuedAt" END,
				"startedAt" = CASE WHEN $2::text = 'RUNNING' THEN now() ELSE "startedAt" END,
				"endedAt" = CASE WHEN $2::text IN ('COMPLETED', 'FAILED', 'STOPPED') THEN now() ELSE "endedAt" END,
				state = CASE WHEN $3::text <> '' THEN jsonb_set(state, '{workflowRunError}', to_jsonb($3::text)) ELSE state END
			WHERE id = $1 RETURNING `+runColumns, id, status, runError)
		if err != nil {
			return fmt.Errorf("update run status: %w", err)
		}
		run, err = collectRun(rows, "update run status")
		return err
	})
	return run, err
}

func (s *Store) SetStepInfo(ctx context.Context, runID, stepID string, info json.RawMessage) error {
	tag, err := s.pool.Exec(ctx, `UPDATE `+table("workflowRun")+` SET "updatedAt" = now(),
			state = jsonb_set(jsonb_set(state, '{stepInfos}', coalesce(state->'stepInfos', '{}'::jsonb)),
				ARRAY['stepInfos', $2::text], $3::jsonb)
		WHERE id = $1 AND "deletedAt" IS NULL`, runID, stepID, info)
	if err != nil {
		return fmt.Errorf("update step info: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update step info: %w", ErrNotFound)
	}
	return nil
}

const runColumns = `id::text, "workflowId"::text, "workflowVersionId"::text, name, status::text, state, "enqueuedAt", "startedAt", "endedAt"`

func collectRun(rows pgx.Rows, action string) (Run, error) {
	run, err := pgx.CollectExactlyOneRow(rows, func(row pgx.CollectableRow) (Run, error) {
		var r Run
		var workflowID, versionID, name *string
		err := row.Scan(&r.ID, &workflowID, &versionID, &name, &r.Status, &r.State, &r.EnqueuedAt, &r.StartedAt, &r.EndedAt)
		r.WorkflowID, r.VersionID, r.Name = deref(workflowID), deref(versionID), deref(name)
		return r, err
	})
	if err != nil {
		return Run{}, fmt.Errorf("%s: %w", action, notFound(err))
	}
	return run, nil
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}
