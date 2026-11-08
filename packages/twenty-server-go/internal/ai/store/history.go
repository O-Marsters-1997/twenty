package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

func (c *Chats) SettledMessages(ctx context.Context, threadID string) ([]ai.StoredMessage, error) {
	if err := assertThreadExists(ctx, c.pool, threadID); err != nil {
		return nil, err
	}
	rows, err := c.pool.Query(ctx, `SELECT jsonb_build_object(
			'id', m.id, 'threadId', m."threadId", 'turnId', m."turnId", 'agentId', m."agentId",
			'senderWorkspaceMemberId', m."senderWorkspaceMemberId", 'role', m.role, 'status', m.status,
			'processedAt', m."processedAt", 'createdAt', m."createdAt",
			'parts', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."orderIndex") FROM `+table("agentMessagePart")+` p
				WHERE p."messageId" = m.id AND p."deletedAt" IS NULL), '[]'::jsonb))
		FROM `+table("agentMessage")+` m
		LEFT JOIN `+table("agentTurn")+` t ON t.id = m."turnId"
		WHERE m."threadId" = $1 AND m."deletedAt" IS NULL AND m.role <> 'system'
			AND NOT (m.role = 'assistant' AND t.status = 'running')
		ORDER BY m."processedAt" NULLS LAST, m."createdAt"`, threadID)
	if err != nil {
		return nil, fmt.Errorf("select messages: %w", err)
	}
	return collectJSON[ai.StoredMessage](rows)
}

func (c *Chats) LatestTurnError(ctx context.Context, threadID string) (*ai.TurnError, error) {
	if err := assertThreadExists(ctx, c.pool, threadID); err != nil {
		return nil, err
	}
	var raw []byte
	err := c.pool.QueryRow(ctx, `SELECT error FROM (
			SELECT status, error FROM `+table("agentTurn")+` WHERE "threadId" = $1 AND "deletedAt" IS NULL
			ORDER BY "createdAt" DESC LIMIT 1
		) latest WHERE status = 'failed' AND error IS NOT NULL`, threadID).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("select latest turn error: %w", err)
	}
	var turnError ai.TurnError
	if err := json.Unmarshal(raw, &turnError); err != nil {
		return nil, fmt.Errorf("decode turn error: %w", err)
	}
	return &turnError, nil
}

func (c *Chats) OpenThreadsSummary(ctx context.Context, memberID string) (ai.OpenThreadsSummary, error) {
	var summary ai.OpenThreadsSummary
	err := c.pool.QueryRow(ctx, `WITH open_thread AS (
			SELECT thread."assigneeId", thread."pendingQuestionMessageId", participant."lastMentionedAt",
				thread."lastActivityAt" IS NOT NULL
					AND (participant."lastReadAt" IS NULL OR thread."lastActivityAt" > participant."lastReadAt") AS "isUnread"
			FROM `+table("agentChatThread")+` thread
			JOIN `+table("agentChatThreadParticipant")+` participant
				ON participant."threadId" = thread.id AND participant."workspaceMemberId" = $1
			WHERE thread."deletedAt" IS NULL AND participant."isSubscribed"
				AND (participant."archivedAt" IS NULL OR thread."lastActivityAt" > participant."archivedAt")
		)
		SELECT COUNT(*)::int, COUNT("pendingQuestionMessageId")::int,
			COALESCE(BOOL_OR("isUnread"), false),
			COALESCE(BOOL_OR("isUnread" AND "lastMentionedAt" IS NOT NULL), false),
			COALESCE(BOOL_OR("isUnread" AND "assigneeId" = $1), false)
		FROM open_thread`, memberID).
		Scan(&summary.OpenThreadCount, &summary.NeedsInputThreadCount, &summary.HasUnreadOpenThread, &summary.HasUnreadMentionThread, &summary.HasUnreadAssignedThread)
	if err != nil {
		return ai.OpenThreadsSummary{}, fmt.Errorf("select open threads summary: %w", err)
	}
	return summary, nil
}

func archiveQuery() string {
	return `INSERT INTO ` + table("agentChatThreadParticipant") + ` AS participant ("threadId", "workspaceMemberId", "archivedAt", "snoozedUntil", "isSubscribed")
		VALUES ($1, $2, CASE WHEN $3::timestamptz <= clock_timestamp() THEN NULL ELSE clock_timestamp() END, $3, true)
		ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET
			"archivedAt" = EXCLUDED."archivedAt", "snoozedUntil" = EXCLUDED."snoozedUntil", "isSubscribed" = true, "updatedAt" = now()
		RETURNING *`
}

func inboxQuery(action ai.InboxAction) (string, error) {
	participants := table("agentChatThreadParticipant")
	switch action {
	case ai.InboxRead:
		return `INSERT INTO ` + participants + ` AS participant ("threadId", "workspaceMemberId", "lastReadAt", "isSubscribed")
			SELECT thread.id, $2, thread."lastActivityAt", false FROM ` + table("agentChatThread") + ` thread WHERE thread.id = $1
			ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET
				"lastReadAt" = GREATEST(participant."lastReadAt", EXCLUDED."lastReadAt"), "updatedAt" = now()
			RETURNING *`, nil
	case ai.InboxUnread:
		return `INSERT INTO ` + participants + ` AS participant ("threadId", "workspaceMemberId", "lastReadAt", "isSubscribed")
			VALUES ($1, $2, NULL, false)
			ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET "lastReadAt" = NULL, "updatedAt" = now()
			RETURNING *`, nil
	case ai.InboxArchive, ai.InboxSnooze:
		return archiveQuery(), nil
	case ai.InboxMoveToInbox:
		return `INSERT INTO ` + participants + ` AS participant ("threadId", "workspaceMemberId") VALUES ($1, $2)
			ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET
				"archivedAt" = NULL, "snoozedUntil" = NULL, "isSubscribed" = true, "updatedAt" = now()
			RETURNING *`, nil
	case ai.InboxSubscribe:
		return `INSERT INTO ` + participants + ` AS participant ("threadId", "workspaceMemberId") VALUES ($1, $2)
			ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET "isSubscribed" = true, "updatedAt" = now()
			RETURNING *`, nil
	case ai.InboxUnsubscribe:
		return `INSERT INTO ` + participants + ` AS participant ("threadId", "workspaceMemberId", "isSubscribed", "archivedAt")
			VALUES ($1, $2, false, clock_timestamp())
			ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET
				"isSubscribed" = false, "archivedAt" = EXCLUDED."archivedAt", "snoozedUntil" = NULL, "updatedAt" = now()
			RETURNING *`, nil
	}
	return "", fmt.Errorf("unknown inbox action %q", action)
}

func (c *Chats) UpdateInboxState(ctx context.Context, memberID string, threadIDs []string, action ai.InboxAction, snoozedUntil *time.Time) ([]ai.ThreadParticipant, error) {
	if action == ai.InboxSnooze && (snoozedUntil == nil || !snoozedUntil.After(time.Now())) {
		return nil, ai.ErrSnoozeTimeNotInFuture
	}
	statement, err := inboxQuery(action)
	if err != nil {
		return nil, err
	}
	extraArgs := []any{}
	if action == ai.InboxArchive || action == ai.InboxSnooze {
		var until *time.Time
		if action == ai.InboxSnooze {
			until = snoozedUntil
		}
		extraArgs = append(extraArgs, until)
	}

	sorted := slices.Clone(threadIDs)
	slices.Sort(sorted)
	sorted = slices.Compact(sorted)

	var participants []ai.ThreadParticipant
	err = pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		participants = participants[:0]
		for _, threadID := range sorted {
			var assigneeID *string
			err := tx.QueryRow(ctx, `SELECT "assigneeId"::text FROM `+table("agentChatThread")+` WHERE id = $1 FOR UPDATE`, threadID).Scan(&assigneeID)
			if errors.Is(err, pgx.ErrNoRows) {
				return ai.ErrThreadNotFound
			}
			if err != nil {
				return fmt.Errorf("lock thread: %w", err)
			}
			if action == ai.InboxUnsubscribe && assigneeID != nil && *assigneeID == memberID {
				return ai.ErrAssigneeCannotUnsubscribe
			}
			rows, err := tx.Query(ctx, `WITH written AS (`+statement+`) SELECT to_jsonb(written) FROM written`, append([]any{threadID, memberID}, extraArgs...)...)
			if err != nil {
				return fmt.Errorf("write participant: %w", err)
			}
			written, err := collectJSON[ai.ThreadParticipant](rows)
			if err != nil {
				return err
			}
			participants = append(participants, written...)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return participants, nil
}

func (c *Chats) Assign(ctx context.Context, memberID, threadID string, assigneeID *string) error {
	return pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		if err := assertThreadExists(ctx, tx, threadID); err != nil {
			return err
		}
		if assigneeID != nil {
			_, err := tx.Exec(ctx, `INSERT INTO `+table("agentChatThreadParticipant")+` AS participant ("threadId", "workspaceMemberId", "lastReadAt")
				SELECT thread.id, $2, CASE WHEN $3::boolean THEN thread."lastActivityAt" END
				FROM `+table("agentChatThread")+` thread WHERE thread.id = $1
				ON CONFLICT ("threadId", "workspaceMemberId") DO UPDATE SET
					"lastReadAt" = CASE WHEN $3::boolean THEN participant."lastReadAt" END,
					"archivedAt" = NULL, "snoozedUntil" = NULL, "isSubscribed" = true, "updatedAt" = now()`,
				threadID, *assigneeID, *assigneeID == memberID)
			if err != nil {
				return fmt.Errorf("follow thread as assignee: %w", err)
			}
		}
		_, err := tx.Exec(ctx, `UPDATE `+table("agentChatThread")+` SET "assigneeId" = $2::uuid, "updatedAt" = now(),
				"writerWorkspaceMemberIds" = CASE
					WHEN $2::uuid IS NULL OR $2::uuid = "workspaceMemberId"
						OR $2::uuid::text = ANY(COALESCE("writerWorkspaceMemberIds", '{}'))
					THEN "writerWorkspaceMemberIds"
					ELSE array_append(COALESCE("writerWorkspaceMemberIds", '{}'), $2::uuid::text)
				END
			WHERE id = $1`, threadID, assigneeID)
		return wrap("assign thread", err)
	})
}

type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func assertThreadExists(ctx context.Context, db queryRower, threadID string) error {
	var found bool
	err := db.QueryRow(ctx, `SELECT true FROM `+table("agentChatThread")+` WHERE id = $1`, threadID).Scan(&found)
	if errors.Is(err, pgx.ErrNoRows) {
		return ai.ErrThreadNotFound
	}
	return wrap("select thread", err)
}

func collectJSON[TValue any](rows pgx.Rows) ([]TValue, error) {
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read rows: %w", err)
	}
	values := make([]TValue, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &values[i]); err != nil {
			return nil, fmt.Errorf("decode row: %w", err)
		}
	}
	return values, nil
}
