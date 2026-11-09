package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	streamFailedCode        = "STREAM_EXECUTION_FAILED"
	streamErrorMaxLength    = 2000
	lastMessageTextMaxChars = 280
)

type Chats struct {
	pool *pgxpool.Pool
}

var (
	_ ai.ChunkStore = (*Chats)(nil)
	_ ai.History    = (*Chats)(nil)
)

func New(pool *pgxpool.Pool) *Chats {
	return &Chats{pool: pool}
}

func table(name string) string {
	return pgx.Identifier{workspace.SchemaName(), name}.Sanitize()
}

type chunk struct {
	Type             string          `json:"type"`
	MessageID        string          `json:"messageId"`
	ToolCallID       string          `json:"toolCallId"`
	ToolName         string          `json:"toolName"`
	Dynamic          bool            `json:"dynamic"`
	ProviderExecuted *bool           `json:"providerExecuted"`
	ProviderMetadata json.RawMessage `json:"providerMetadata"`
	Delta            string          `json:"delta"`
	Input            json.RawMessage `json:"input"`
	Output           json.RawMessage `json:"output"`
	ErrorText        string          `json:"errorText"`
	SourceID         string          `json:"sourceId"`
	URL              string          `json:"url"`
	Title            string          `json:"title"`
	MediaType        string          `json:"mediaType"`
	Filename         string          `json:"filename"`
}

func (c *Chats) SaveChunk(ctx context.Context, event ai.ChatEvent) error {
	var decoded chunk
	if err := json.Unmarshal(event.Event, &decoded); err != nil {
		return fmt.Errorf("decode chunk: %w", err)
	}
	return pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		return applyChunk(ctx, tx, event.ThreadID, decoded)
	})
}

func applyChunk(ctx context.Context, tx pgx.Tx, threadID string, c chunk) error {
	if c.Type == "start" {
		return startTurn(ctx, tx, threadID, c.MessageID)
	}

	var messageID, turnID string
	err := tx.QueryRow(ctx, `SELECT m.id::text, m."turnId"::text FROM `+table("agentMessage")+` m
		JOIN `+table("agentTurn")+` t ON t.id = m."turnId"
		WHERE m."threadId" = $1 AND m.role = 'assistant' AND t.status = 'running'
		ORDER BY m."createdAt" DESC LIMIT 1`, threadID).Scan(&messageID, &turnID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("find turn in flight: %w", err)
	}

	switch c.Type {
	case "text-start":
		return insertPart(ctx, tx, messageID, "text", "textContent")
	case "text-delta":
		return appendDelta(ctx, tx, messageID, "text", "textContent", c.Delta)
	case "reasoning-start":
		return insertPart(ctx, tx, messageID, "reasoning", "reasoningContent")
	case "reasoning-delta":
		return appendDelta(ctx, tx, messageID, "reasoning", "reasoningContent", c.Delta)
	case "tool-input-start":
		return upsertTool(ctx, tx, messageID, c, "input-streaming")
	case "tool-input-available":
		return upsertTool(ctx, tx, messageID, c, "input-available")
	case "tool-input-error", "tool-output-error":
		return upsertTool(ctx, tx, messageID, c, "output-error")
	case "tool-output-available":
		return upsertTool(ctx, tx, messageID, c, "output-available")
	case "source-url":
		_, err := tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, "sourceUrlSourceId", "sourceUrlUrl", "sourceUrlTitle", "providerMetadata")
			SELECT $1, `+nextOrderIndex()+`, 'source-url', $2, $3, $4, $5::jsonb`, messageID, c.SourceID, c.URL, c.Title, jsonOrNil(c.ProviderMetadata))
		return wrap("insert source-url part", err)
	case "source-document":
		_, err := tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, "sourceDocumentSourceId", "sourceDocumentMediaType", "sourceDocumentTitle", "sourceDocumentFilename", "providerMetadata")
			SELECT $1, `+nextOrderIndex()+`, 'source-document', $2, $3, $4, $5, $6::jsonb`, messageID, c.SourceID, c.MediaType, c.Title, c.Filename, jsonOrNil(c.ProviderMetadata))
		return wrap("insert source-document part", err)
	case "finish":
		return endTurn(ctx, tx, threadID, messageID, turnID, "completed", nil)
	case "abort":
		return endTurn(ctx, tx, threadID, messageID, turnID, "cancelled", nil)
	case "error":
		message := c.ErrorText
		if len(message) > streamErrorMaxLength {
			message = strings.ToValidUTF8(message[:streamErrorMaxLength], "") + "…"
		}
		return endTurn(ctx, tx, threadID, messageID, turnID, "failed", &ai.TurnError{Code: streamFailedCode, Message: message})
	}
	return nil
}

func nextOrderIndex() string {
	return `coalesce((SELECT max("orderIndex") + 1 FROM ` + table("agentMessagePart") + ` WHERE "messageId" = $1), 0)`
}

func startTurn(ctx context.Context, tx pgx.Tx, threadID, messageID string) error {
	_, err := tx.Exec(ctx, `WITH stale AS (
			UPDATE `+table("agentTurn")+` SET status = 'failed', "endedAt" = now(),
				error = jsonb_build_object('code', $2::text, 'message', 'The response was interrupted')
			WHERE "threadId" = $1 AND status = 'running' RETURNING id
		)
		UPDATE `+table("agentMessage")+` SET "processedAt" = now() WHERE "turnId" IN (SELECT id FROM stale)`, threadID, streamFailedCode)
	if err != nil {
		return fmt.Errorf("close stale turns: %w", err)
	}
	var id *string
	if _, parseErr := uuid.Parse(messageID); parseErr == nil {
		id = &messageID
	}
	_, err = tx.Exec(ctx, `WITH turn AS (
			INSERT INTO `+table("agentTurn")+` (status, "startedAt", "threadId") VALUES ('running', now(), $1) RETURNING id
		)
		INSERT INTO `+table("agentMessage")+` (id, role, status, "threadId", "turnId")
		SELECT coalesce($2::uuid, gen_random_uuid()), 'assistant', 'sent', $1, turn.id FROM turn`, threadID, id)
	return wrap("insert turn", err)
}

func endTurn(ctx context.Context, tx pgx.Tx, threadID, messageID, turnID, status string, turnError *ai.TurnError) error {
	var encoded any
	if turnError != nil {
		raw, err := json.Marshal(turnError)
		if err != nil {
			return fmt.Errorf("encode turn error: %w", err)
		}
		encoded = string(raw)
	}
	if _, err := tx.Exec(ctx, `UPDATE `+table("agentTurn")+` SET status = $2, error = $3::jsonb, "endedAt" = now(), "updatedAt" = now() WHERE id = $1`, turnID, status, encoded); err != nil {
		return fmt.Errorf("end turn: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE `+table("agentMessage")+` SET "processedAt" = now(), "updatedAt" = now() WHERE id = $1`, messageID); err != nil {
		return fmt.Errorf("process message: %w", err)
	}
	if status != "completed" {
		return nil
	}
	_, err := tx.Exec(ctx, `UPDATE `+table("agentChatThread")+` SET "updatedAt" = now(), "lastActivityAt" = clock_timestamp(),
			"lastMessageText" = left(NULLIF(btrim((SELECT string_agg("textContent", E'\n' ORDER BY "orderIndex") FROM `+table("agentMessagePart")+` WHERE "messageId" = $2 AND type = 'text')), ''), $3)
		WHERE id = $1`, threadID, messageID, lastMessageTextMaxChars)
	return wrap("update thread activity", err)
}

func insertPart(ctx context.Context, tx pgx.Tx, messageID, partType, column string) error {
	_, err := tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, `+pgx.Identifier{column}.Sanitize()+`)
		SELECT $1, `+nextOrderIndex()+`, $2, ''`, messageID, partType)
	return wrap("insert "+partType+" part", err)
}

func appendDelta(ctx context.Context, tx pgx.Tx, messageID, partType, column, delta string) error {
	quoted := pgx.Identifier{column}.Sanitize()
	tag, err := tx.Exec(ctx, `UPDATE `+table("agentMessagePart")+` SET `+quoted+` = coalesce(`+quoted+`, '') || $3, "updatedAt" = now()
		WHERE id = (SELECT id FROM `+table("agentMessagePart")+` WHERE "messageId" = $1 AND type = $2 ORDER BY "orderIndex" DESC LIMIT 1)`, messageID, partType, delta)
	if err != nil {
		return fmt.Errorf("append %s delta: %w", partType, err)
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	_, err = tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, `+quoted+`)
		SELECT $1, `+nextOrderIndex()+`, $2, $3`, messageID, partType, delta)
	return wrap("insert "+partType+" part", err)
}

func upsertTool(ctx context.Context, tx pgx.Tx, messageID string, c chunk, state string) error {
	partType := "tool-" + c.ToolName
	if c.Dynamic {
		partType = "dynamic-tool"
	}
	input := jsonOrNil(c.Input)
	insertedInput := input
	if insertedInput == nil {
		insertedInput = "{}"
	}
	var errorMessage *string
	if c.ErrorText != "" {
		errorMessage = &c.ErrorText
	}
	tag, err := tx.Exec(ctx, `UPDATE `+table("agentMessagePart")+` SET state = $3,
			"toolInput" = coalesce($4::jsonb, "toolInput"),
			"toolOutput" = coalesce($5::jsonb, "toolOutput"),
			"errorMessage" = coalesce($6, "errorMessage"), "updatedAt" = now()
		WHERE "messageId" = $1 AND "toolCallId" = $2`,
		messageID, c.ToolCallID, state, input, jsonOrNil(c.Output), errorMessage)
	if err != nil {
		return fmt.Errorf("update tool part: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	_, err = tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, "toolName", "toolCallId", "toolInput", "toolOutput", state, "providerExecuted", "errorMessage")
		SELECT $1, `+nextOrderIndex()+`, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9`,
		messageID, partType, c.ToolName, c.ToolCallID, insertedInput, jsonOrNil(c.Output), state, c.ProviderExecuted, errorMessage)
	return wrap("insert tool part", err)
}

func jsonOrNil(raw json.RawMessage) any {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	return string(raw)
}

func wrap(action string, err error) error {
	if err != nil {
		return fmt.Errorf("%s: %w", action, err)
	}
	return nil
}
