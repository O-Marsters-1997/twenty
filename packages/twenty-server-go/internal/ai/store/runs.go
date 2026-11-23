package store

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

const (
	defaultRunsLimit = 100
	maxRunsLimit     = 200
)

type Runs struct {
	pool *pgxpool.Pool
}

func NewRuns(pool *pgxpool.Pool) *Runs {
	return &Runs{pool: pool}
}

func toTimestamp(value *time.Time) *metadata.Timestamp {
	if value == nil {
		return nil
	}
	return &metadata.Timestamp{Time: *value}
}

func (r *Runs) List(ctx context.Context, agentID string, limit *int) ([]ai.AgentRun, error) {
	take := defaultRunsLimit
	if limit != nil {
		take = min(max(*limit, 1), maxRunsLimit)
	}
	rows, err := r.pool.Query(ctx, `SELECT t.id::text, t."threadId"::text, th.title, upper(t.status), t.error->>'message',
			t."createdAt", t."startedAt", t."endedAt", nullif(t."modelId", ''), t."inputTokens"::int, t."outputTokens"::int,
			t."createdBySource", t."createdByName"
		FROM `+table("agentTurn")+` t
		LEFT JOIN `+table("agentChatThread")+` th ON th.id = t."threadId" AND th."deletedAt" IS NULL
		WHERE t."agentId" = $1::uuid AND t."deletedAt" IS NULL
		ORDER BY t."createdAt" DESC, t.id DESC LIMIT $2`, agentID, take)
	if err != nil {
		return nil, fmt.Errorf("select agent turns: %w", err)
	}
	runs, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (ai.AgentRun, error) {
		run := ai.AgentRun{ToolNames: []string{}}
		var createdAt time.Time
		var startedAt, endedAt *time.Time
		err := row.Scan(&run.ID, &run.ThreadID, &run.ThreadTitle, &run.Status, &run.ErrorMessage,
			&createdAt, &startedAt, &endedAt, &run.ModelID, &run.InputTokens, &run.OutputTokens,
			&run.CreatorSource, &run.CreatorName)
		run.CreatedAt, run.StartedAt, run.EndedAt = metadata.Timestamp{Time: createdAt}, toTimestamp(startedAt), toTimestamp(endedAt)
		return run, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan agent turns: %w", err)
	}
	if len(runs) == 0 {
		return runs, nil
	}
	return runs, r.addMessages(ctx, runs)
}

type turnText struct {
	input     []string
	reply     []string
	replyID   string
	toolNames []string
}

func (r *Runs) addMessages(ctx context.Context, runs []ai.AgentRun) error {
	ids := make([]string, len(runs))
	for i, run := range runs {
		ids[i] = run.ID
	}
	rows, err := r.pool.Query(ctx, `SELECT m."turnId"::text, m.id::text, m.role = 'assistant' AND m."agentId" IS NOT NULL,
			m."agentId" IS NULL, p.type, p."textContent", p."toolName"
		FROM `+table("agentMessage")+` m
		LEFT JOIN `+table("agentMessagePart")+` p ON p."messageId" = m.id AND p."deletedAt" IS NULL
		WHERE m."turnId" = ANY($1::uuid[]) AND m."deletedAt" IS NULL
		ORDER BY m."createdAt", m.id, p."orderIndex"`, ids)
	if err != nil {
		return fmt.Errorf("select agent turn messages: %w", err)
	}
	defer rows.Close()

	byTurn := make(map[string]*turnText, len(runs))
	for rows.Next() {
		var turnID, messageID string
		var isAgent, isInput bool
		var partType, text, toolName *string
		if err := rows.Scan(&turnID, &messageID, &isAgent, &isInput, &partType, &text, &toolName); err != nil {
			return fmt.Errorf("scan agent turn messages: %w", err)
		}
		turn := byTurn[turnID]
		if turn == nil {
			turn = &turnText{}
			byTurn[turnID] = turn
		}
		isText := partType != nil && *partType == "text" && text != nil && *text != ""
		switch {
		case isAgent:
			if turn.replyID != messageID {
				turn.replyID, turn.reply = messageID, nil
			}
			if isText {
				turn.reply = append(turn.reply, *text)
			}
			if toolName != nil && *toolName != "" && !slices.Contains(turn.toolNames, *toolName) {
				turn.toolNames = append(turn.toolNames, *toolName)
			}
		case isInput && isText:
			turn.input = append(turn.input, *text)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read agent turn messages: %w", err)
	}
	for i := range runs {
		if turn := byTurn[runs[i].ID]; turn != nil {
			runs[i].Input, runs[i].Reply = joinText(turn.input), joinText(turn.reply)
			runs[i].ToolNames = append(runs[i].ToolNames, turn.toolNames...)
		}
	}
	return nil
}

func joinText(texts []string) *string {
	joined := strings.TrimSpace(strings.Join(texts, "\n\n"))
	if joined == "" {
		return nil
	}
	return &joined
}
