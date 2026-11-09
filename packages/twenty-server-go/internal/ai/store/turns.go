package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

const (
	messageSent   = "sent"
	messageQueued = "queued"

	toolInputAvailable  = "input-available"
	toolOutputAvailable = "output-available"
	toolOutputError     = "output-error"
)

var _ ai.ChatStore = (*Chats)(nil)

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func (c *Chats) EnsureThread(ctx context.Context, threadID, memberID string) error {
	return pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `INSERT INTO `+table("agentChatThread")+` (id, "workspaceMemberId", "lastActivityAt")
			VALUES ($1, $2, now()) ON CONFLICT (id) DO NOTHING`, threadID, nullable(memberID))
		if err != nil {
			return fmt.Errorf("insert thread: %w", err)
		}
		if tag.RowsAffected() == 0 || memberID == "" {
			return nil
		}
		_, err = tx.Exec(ctx, `INSERT INTO `+table("agentChatThreadParticipant")+` ("threadId", "workspaceMemberId", "lastReadAt")
			VALUES ($1, $2, now())`, threadID, memberID)
		return wrap("insert thread participant", err)
	})
}

func (c *Chats) AddMessage(ctx context.Context, message ai.NewMessage) error {
	status := messageSent
	if message.Queued {
		status = messageQueued
	}
	return pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `INSERT INTO `+table("agentMessage")+` (id, role, status, "threadId", "senderWorkspaceMemberId", "processedAt")
			VALUES ($1, 'user', $2::text, $3, $4, CASE WHEN $2::text = 'sent' THEN now() END)`,
			message.ID, status, message.ThreadID, nullable(message.MemberID))
		if err != nil {
			return fmt.Errorf("insert message: %w", err)
		}
		_, err = tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, "textContent") VALUES ($1, 0, 'text', $2)`,
			message.ID, message.Text)
		if err != nil {
			return fmt.Errorf("insert text part: %w", err)
		}
		for i, file := range message.Files {
			_, err = tx.Exec(ctx, `INSERT INTO `+table("agentMessagePart")+` ("messageId", "orderIndex", type, "fileId", "fileFilename") VALUES ($1, $2, 'file', $3, $4)`,
				message.ID, i+1, file.ID, file.Filename)
			if err != nil {
				return fmt.Errorf("insert file part: %w", err)
			}
		}
		_, err = tx.Exec(ctx, `UPDATE `+table("agentChatThread")+` SET "updatedAt" = now(), "lastActivityAt" = clock_timestamp(),
				"lastMessageText" = left(NULLIF(btrim($2::text), ''), $3), "lastMessageSenderWorkspaceMemberId" = $4
			WHERE id = $1`, message.ThreadID, message.Text, lastMessageTextMaxChars, nullable(message.MemberID))
		return wrap("update thread activity", err)
	})
}

type conversationMessage struct {
	Role  string           `json:"role"`
	Parts []ai.MessagePart `json:"parts"`
}

func (c *Chats) Conversation(ctx context.Context, threadID string) ([]ai.Message, error) {
	rows, err := c.pool.Query(ctx, `SELECT jsonb_build_object('role', m.role,
			'parts', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."orderIndex") FROM `+table("agentMessagePart")+` p
				WHERE p."messageId" = m.id AND p."deletedAt" IS NULL), '[]'::jsonb))
		FROM `+table("agentMessage")+` m
		LEFT JOIN `+table("agentTurn")+` t ON t.id = m."turnId"
		WHERE m."threadId" = $1 AND m."deletedAt" IS NULL AND m.status = 'sent'
			AND (m.role = 'user' OR (m.role = 'assistant' AND t.status = 'completed'))
		ORDER BY m."processedAt" NULLS LAST, m."createdAt"`, threadID)
	if err != nil {
		return nil, fmt.Errorf("select conversation: %w", err)
	}
	stored, err := collectJSON[conversationMessage](rows)
	if err != nil {
		return nil, err
	}
	return toMessages(stored), nil
}

func toMessages(stored []conversationMessage) []ai.Message {
	var messages []ai.Message
	for _, message := range stored {
		var parts, results []ai.Part
		for _, part := range message.Parts {
			switch {
			case part.Type == "text" && part.TextContent != nil && *part.TextContent != "":
				parts = append(parts, ai.Part{Type: ai.PartText, Text: *part.TextContent})
			case message.Role == "assistant" && part.ToolCallID != nil && part.ToolName != nil:
				call, result, ok := toolParts(part)
				if ok {
					parts = append(parts, call)
					results = append(results, result)
				}
			}
		}
		if len(parts) > 0 {
			messages = append(messages, ai.Message{Role: ai.Role(message.Role), Parts: parts})
		}
		if len(results) > 0 {
			messages = append(messages, ai.Message{Role: ai.RoleTool, Parts: results})
		}
	}
	return messages
}

func toolParts(part ai.MessagePart) (call, result ai.Part, ok bool) {
	call = ai.Part{Type: ai.PartToolCall, ToolCallID: *part.ToolCallID, ToolName: *part.ToolName, Input: part.ToolInput}
	result = ai.Part{Type: ai.PartToolResult, ToolCallID: *part.ToolCallID, ToolName: *part.ToolName, Output: part.ToolOutput}
	if part.State == nil {
		return call, result, false
	}
	switch *part.State {
	case toolOutputAvailable:
		return call, result, len(result.Output) > 0
	case toolOutputError:
		message := ""
		if part.ErrorMessage != nil {
			message = *part.ErrorMessage
		}
		output, err := json.Marshal(map[string]string{"error": message})
		if err != nil {
			return call, result, false
		}
		result.Output = output
		return call, result, true
	}
	return call, result, false
}

func (c *Chats) QueuedMessageThread(ctx context.Context, messageID string) (string, error) {
	var threadID string
	err := c.pool.QueryRow(ctx, `SELECT "threadId"::text FROM `+table("agentMessage")+`
		WHERE id = $1 AND status = 'queued' AND "deletedAt" IS NULL`, messageID).Scan(&threadID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ai.ErrMessageNotFound
	}
	return threadID, wrap("select queued message", err)
}

func (c *Chats) DeleteQueuedMessage(ctx context.Context, messageID string) (bool, error) {
	tag, err := c.pool.Exec(ctx, `UPDATE `+table("agentMessage")+` SET "deletedAt" = now(), "updatedAt" = now()
		WHERE id = $1 AND status = 'queued' AND "deletedAt" IS NULL`, messageID)
	if err != nil {
		return false, fmt.Errorf("delete queued message: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (c *Chats) PromoteQueuedMessage(ctx context.Context, threadID string) (bool, error) {
	tag, err := c.pool.Exec(ctx, `UPDATE `+table("agentMessage")+` SET status = 'sent', "processedAt" = now(), "updatedAt" = now()
		WHERE id = (SELECT id FROM `+table("agentMessage")+`
			WHERE "threadId" = $1 AND status = 'queued' AND "deletedAt" IS NULL
			ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED)`, threadID)
	if err != nil {
		return false, fmt.Errorf("promote queued message: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (c *Chats) DiscardFailedTurn(ctx context.Context, threadID string) error {
	if err := assertThreadExists(ctx, c.pool, threadID); err != nil {
		return err
	}
	return pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		var turnID, status string
		err := tx.QueryRow(ctx, `SELECT id::text, status FROM `+table("agentTurn")+`
			WHERE "threadId" = $1 AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1`, threadID).Scan(&turnID, &status)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && status != "failed") {
			return ai.ErrNoFailedTurn
		}
		if err != nil {
			return fmt.Errorf("select latest turn: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE `+table("agentMessage")+` SET "deletedAt" = now(), "updatedAt" = now()
			WHERE "turnId" = $1 AND role = 'assistant' AND "deletedAt" IS NULL`, turnID)
		return wrap("discard failed turn", err)
	})
}

func (c *Chats) AnswerToolCall(ctx context.Context, threadID, toolCallID string, output json.RawMessage) (int, error) {
	var stillPending int
	err := pgx.BeginFunc(ctx, c.pool, func(tx pgx.Tx) error {
		var state *string
		err := tx.QueryRow(ctx, `SELECT p.state FROM `+table("agentMessagePart")+` p
			JOIN `+table("agentMessage")+` m ON m.id = p."messageId"
			WHERE m."threadId" = $1 AND p."toolCallId" = $2 AND p."deletedAt" IS NULL`, threadID, toolCallID).Scan(&state)
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			return ai.ErrToolCallNotFound
		case err != nil:
			return fmt.Errorf("select tool call: %w", err)
		case state == nil || *state != toolInputAvailable:
			return ai.ErrToolCallNotPending
		}
		_, err = tx.Exec(ctx, `UPDATE `+table("agentMessagePart")+` SET "toolOutput" = $3::jsonb, state = 'output-available', "updatedAt" = now()
			WHERE "toolCallId" = $2 AND "messageId" IN (SELECT id FROM `+table("agentMessage")+` WHERE "threadId" = $1)`,
			threadID, toolCallID, strings.TrimSpace(string(output)))
		if err != nil {
			return fmt.Errorf("answer tool call: %w", err)
		}
		err = tx.QueryRow(ctx, `SELECT count(*) FROM `+table("agentMessagePart")+` p
			JOIN `+table("agentMessage")+` m ON m.id = p."messageId"
			WHERE m."threadId" = $1 AND p.state = 'input-available' AND p."deletedAt" IS NULL`, threadID).Scan(&stillPending)
		return wrap("count pending tool calls", err)
	})
	return stillPending, err
}
