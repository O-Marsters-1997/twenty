package onboarding

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	StatusWorkspaceActivation = "WORKSPACE_ACTIVATION"
	StatusProfileCreation     = "PROFILE_CREATION"
	StatusSyncEmail           = "SYNC_EMAIL"
	StatusInviteTeam          = "INVITE_TEAM"
	StatusCompleted           = "COMPLETED"
)

const (
	keyConnectAccountPending = "ONBOARDING_CONNECT_ACCOUNT_PENDING"
	keyInviteTeamPending     = "ONBOARDING_INVITE_TEAM_PENDING"
	keyCreateProfilePending  = "ONBOARDING_CREATE_PROFILE_PENDING"
	keyStepHistory           = "ONBOARDING_REVERSIBLE_STEP_HISTORY"
)

var reversibleSteps = []string{StatusSyncEmail, StatusProfileCreation, StatusInviteTeam}

var pendingKeyByStep = map[string]string{
	StatusSyncEmail:       keyConnectAccountPending,
	StatusProfileCreation: keyCreateProfilePending,
	StatusInviteTeam:      keyInviteTeamPending,
}

var ErrNoPreviousStep = errors.New("there is no previous onboarding step to go back to")

type Navigation struct {
	Status         *string
	PreviousStatus *string
}

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

// Skip clears the user's connect-account flag. A manual skip is recorded so the user can go back to it.
func (s *Store) Skip(ctx context.Context, userID, workspaceID string, isAutoSkipped bool) error {
	return s.transition(ctx, userID, workspaceID, func(tx pgx.Tx) error {
		claimed, err := deleteUserVar(ctx, tx, userID, workspaceID, keyConnectAccountPending)
		if err != nil || !claimed || isAutoSkipped {
			return err
		}
		history, err := readHistory(ctx, tx, userID, workspaceID)
		if err != nil {
			return err
		}
		return writeHistory(ctx, tx, userID, workspaceID, append(history, StatusSyncEmail))
	})
}

// GoBack pops the latest reversible step, restores its pending flag and returns where the user lands.
func (s *Store) GoBack(ctx context.Context, userID, workspaceID string) (Navigation, error) {
	var navigation Navigation
	err := s.transition(ctx, userID, workspaceID, func(tx pgx.Tx) error {
		history, err := readHistory(ctx, tx, userID, workspaceID)
		if err != nil {
			return err
		}
		if len(history) == 0 {
			return ErrNoPreviousStep
		}
		step := history[len(history)-1]
		history = history[:len(history)-1]
		if err := writeHistory(ctx, tx, userID, workspaceID, history); err != nil {
			return err
		}
		if err := setPending(ctx, tx, userID, workspaceID, pendingKeyByStep[step]); err != nil {
			return err
		}
		navigation.Status, err = status(ctx, tx, userID, workspaceID)
		if err != nil {
			return err
		}
		if len(history) > 0 {
			navigation.PreviousStatus = &history[len(history)-1]
		}
		return nil
	})
	return navigation, err
}

func (s *Store) transition(ctx context.Context, userID, workspaceID string, run func(tx pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
			"onboarding-step-transition:"+userID+":"+workspaceID); err != nil {
			return fmt.Errorf("lock onboarding transition: %w", err)
		}
		return run(tx)
	})
}

func status(ctx context.Context, tx pgx.Tx, userID, workspaceID string) (*string, error) {
	var activation string
	if err := tx.QueryRow(ctx, `SELECT "activationStatus"::text FROM core.workspace WHERE id = $1::uuid`, workspaceID).Scan(&activation); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("read activation status: %w", err)
	}
	result := StatusCompleted
	if activation == "PENDING_CREATION" || activation == "ONGOING_CREATION" {
		result = StatusWorkspaceActivation
	} else {
		var pending []string
		if err := tx.QueryRow(ctx, `SELECT coalesce(array_agg(DISTINCT key), '{}') FROM core."keyValuePair"
			WHERE type = 'USER_VARIABLE' AND "applicationId" IS NULL AND value = 'true'::jsonb AND key = ANY($3)
			AND (("userId" IS NULL AND "workspaceId" = $2::uuid) OR ("userId" = $1::uuid AND "workspaceId" IS NULL)
				OR ("userId" = $1::uuid AND "workspaceId" = $2::uuid))`,
			userID, workspaceID, []string{keyConnectAccountPending, keyCreateProfilePending, keyInviteTeamPending}).Scan(&pending); err != nil {
			return nil, fmt.Errorf("read pending onboarding steps: %w", err)
		}
		for _, step := range reversibleSteps {
			if slices.Contains(pending, pendingKeyByStep[step]) {
				result = step
				break
			}
		}
	}
	return &result, nil
}

func readHistory(ctx context.Context, tx pgx.Tx, userID, workspaceID string) ([]string, error) {
	var raw []byte
	err := tx.QueryRow(ctx, `SELECT value FROM core."keyValuePair" WHERE type = 'USER_VARIABLE' AND "applicationId" IS NULL
		AND "userId" = $1::uuid AND "workspaceId" = $2::uuid AND key = $3`, userID, workspaceID, keyStepHistory).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read step history: %w", err)
	}
	var stored []string
	if json.Unmarshal(raw, &stored) != nil {
		return nil, nil
	}
	return slices.DeleteFunc(stored, func(step string) bool { return !slices.Contains(reversibleSteps, step) }), nil
}

func writeHistory(ctx context.Context, tx pgx.Tx, userID, workspaceID string, history []string) error {
	encoded, err := json.Marshal(history)
	if err != nil {
		return fmt.Errorf("encode step history: %w", err)
	}
	return setUserVar(ctx, tx, userID, workspaceID, keyStepHistory, encoded)
}

func setPending(ctx context.Context, tx pgx.Tx, userID, workspaceID, key string) error {
	return setUserVar(ctx, tx, userID, workspaceID, key, []byte("true"))
}

func setUserVar(ctx context.Context, tx pgx.Tx, userID, workspaceID, key string, value []byte) error {
	if _, err := deleteUserVar(ctx, tx, userID, workspaceID, key); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO core."keyValuePair" ("userId", "workspaceId", key, value, type) VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, 'USER_VARIABLE')`,
		userID, workspaceID, key, value); err != nil {
		return fmt.Errorf("set %s: %w", key, err)
	}
	return nil
}

func deleteUserVar(ctx context.Context, tx pgx.Tx, userID, workspaceID, key string) (bool, error) {
	tag, err := tx.Exec(ctx, `DELETE FROM core."keyValuePair" WHERE type = 'USER_VARIABLE' AND "applicationId" IS NULL
		AND "userId" = $1::uuid AND "workspaceId" = $2::uuid AND key = $3`, userID, workspaceID, key)
	if err != nil {
		return false, fmt.Errorf("delete %s: %w", key, err)
	}
	return tag.RowsAffected() > 0, nil
}
