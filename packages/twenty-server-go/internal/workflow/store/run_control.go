package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const clearFailedSteps = `state = jsonb_set(state - 'workflowRunError', '{stepInfos}', coalesce((
		SELECT jsonb_object_agg(key, value) FROM jsonb_each(coalesce(state->'stepInfos', '{}'::jsonb)) WHERE value->>'status' <> 'FAILED'
	), '{}'::jsonb))`

func (s *Store) Retry(ctx context.Context, id string) (previous, current Run, retried bool, err error) {
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT `+runColumns+` FROM `+table("workflowRun")+` WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`, id)
		if err != nil {
			return fmt.Errorf("lock run: %w", err)
		}
		if previous, err = collectRun(rows, "lock run"); err != nil {
			return err
		}
		current = previous
		if previous.Status != StatusFailed {
			return nil
		}
		rows, err = tx.Query(ctx, `UPDATE `+table("workflowRun")+` SET status = 'RUNNING'::text::`+table("workflowRun_status_enum")+`,
				"endedAt" = NULL, "updatedAt" = now(), `+clearFailedSteps+` WHERE id = $1 RETURNING `+runColumns, id)
		if err != nil {
			return fmt.Errorf("retry run: %w", err)
		}
		current, err = collectRun(rows, "retry run")
		retried = err == nil
		return err
	})
	return previous, current, retried, err
}

func (s *Store) Revert(ctx context.Context, previous Run) error {
	_, err := s.pool.Exec(ctx, `UPDATE `+table("workflowRun")+` SET status = $2::text::`+table("workflowRun_status_enum")+`,
			state = $3, "endedAt" = $4, "updatedAt" = now() WHERE id = $1`, previous.ID, previous.Status, previous.State, previous.EndedAt)
	if err != nil {
		return fmt.Errorf("revert run: %w", err)
	}
	return nil
}

func (s *Store) ReplaceRunStep(ctx context.Context, runID, stepID string, step json.RawMessage) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var status string
		err := tx.QueryRow(ctx, `SELECT status::text FROM `+table("workflowRun")+` WHERE id = $1 AND "deletedAt" IS NULL FOR UPDATE`, runID).Scan(&status)
		if err != nil {
			return fmt.Errorf("lock run: %w", notFound(err))
		}
		if status == StatusCompleted || status == StatusFailed {
			return fmt.Errorf("steps of a %s run: %w", status, ErrInvalidTransition)
		}
		_, err = tx.Exec(ctx, `UPDATE `+table("workflowRun")+` SET "updatedAt" = now(),
				state = CASE WHEN jsonb_typeof(state#>'{flow,steps}') = 'array' THEN jsonb_set(state, '{flow,steps}', (
					SELECT jsonb_agg(CASE WHEN candidate->>'id' = $2 THEN $3::jsonb ELSE candidate END)
					FROM jsonb_array_elements(state#>'{flow,steps}') candidate)) ELSE state END
			WHERE id = $1`, runID, stepID, step)
		if err != nil {
			return fmt.Errorf("replace run step: %w", err)
		}
		return nil
	})
}

type ConnectedAccount struct {
	ID            string
	Handle        string
	Provider      string
	HandleAliases []string
}

func (s *Store) ConnectedAccount(ctx context.Context, id string) (*ConnectedAccount, error) {
	var account ConnectedAccount
	err := s.pool.QueryRow(ctx, `SELECT id::text, handle, provider, "handleAliases" FROM core."connectedAccount"
		WHERE id = $1 AND "workspaceId" = $2`, id, workspaceID()).Scan(&account.ID, &account.Handle, &account.Provider, &account.HandleAliases)
	if err != nil {
		if notFound(err) == ErrNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("select connected account: %w", err)
	}
	return &account, nil
}
