package ai

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrThreadNotFound            = errors.New("chat thread not found")
	ErrSnoozeTimeNotInFuture     = errors.New("snooze time must be in the future")
	ErrAssigneeCannotUnsubscribe = errors.New("the assignee of a chat cannot unsubscribe from it")
)

type InboxAction string

const (
	InboxRead        InboxAction = "READ"
	InboxUnread      InboxAction = "UNREAD"
	InboxArchive     InboxAction = "ARCHIVE"
	InboxSnooze      InboxAction = "SNOOZE"
	InboxMoveToInbox InboxAction = "MOVE_TO_INBOX"
	InboxSubscribe   InboxAction = "SUBSCRIBE"
	InboxUnsubscribe InboxAction = "UNSUBSCRIBE"
)

type MessagePart struct {
	ID                      string          `json:"id"`
	MessageID               string          `json:"messageId"`
	OrderIndex              int             `json:"orderIndex"`
	Type                    string          `json:"type"`
	TextContent             *string         `json:"textContent"`
	ReasoningContent        *string         `json:"reasoningContent"`
	ToolName                *string         `json:"toolName"`
	ToolCallID              *string         `json:"toolCallId"`
	ToolInput               json.RawMessage `json:"toolInput"`
	ToolOutput              json.RawMessage `json:"toolOutput"`
	State                   *string         `json:"state"`
	ProviderExecuted        *bool           `json:"providerExecuted"`
	ErrorMessage            *string         `json:"errorMessage"`
	SourceURLSourceID       *string         `json:"sourceUrlSourceId"`
	SourceURLURL            *string         `json:"sourceUrlUrl"`
	SourceURLTitle          *string         `json:"sourceUrlTitle"`
	SourceDocumentSourceID  *string         `json:"sourceDocumentSourceId"`
	SourceDocumentMediaType *string         `json:"sourceDocumentMediaType"`
	SourceDocumentTitle     *string         `json:"sourceDocumentTitle"`
	SourceDocumentFilename  *string         `json:"sourceDocumentFilename"`
	FileFilename            *string         `json:"fileFilename"`
	FileID                  *string         `json:"fileId"`
	ProviderMetadata        json.RawMessage `json:"providerMetadata"`
	CreatedAt               time.Time       `json:"createdAt"`
}

type StoredMessage struct {
	ID                      string        `json:"id"`
	ThreadID                string        `json:"threadId"`
	TurnID                  *string       `json:"turnId"`
	AgentID                 *string       `json:"agentId"`
	SenderWorkspaceMemberID *string       `json:"senderWorkspaceMemberId"`
	Role                    string        `json:"role"`
	Status                  string        `json:"status"`
	ProcessedAt             *time.Time    `json:"processedAt"`
	CreatedAt               time.Time     `json:"createdAt"`
	Parts                   []MessagePart `json:"parts"`
}

type TurnError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type OpenThreadsSummary struct {
	OpenThreadCount         int  `json:"openThreadCount"`
	NeedsInputThreadCount   int  `json:"needsInputThreadCount"`
	HasUnreadOpenThread     bool `json:"hasUnreadOpenThread"`
	HasUnreadMentionThread  bool `json:"hasUnreadMentionThread"`
	HasUnreadAssignedThread bool `json:"hasUnreadAssignedThread"`
}

type ThreadParticipant struct {
	ID              string     `json:"id"`
	ThreadID        string     `json:"threadId"`
	LastReadAt      *time.Time `json:"lastReadAt"`
	ArchivedAt      *time.Time `json:"archivedAt"`
	SnoozedUntil    *time.Time `json:"snoozedUntil"`
	IsSubscribed    bool       `json:"isSubscribed"`
	LastMentionedAt *time.Time `json:"lastMentionedAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type ChunkStore interface {
	SaveChunk(ctx context.Context, event ChatEvent) error
}

type History interface {
	SettledMessages(ctx context.Context, threadID string) ([]StoredMessage, error)
	LatestTurnError(ctx context.Context, threadID string) (*TurnError, error)
	OpenThreadsSummary(ctx context.Context, memberID string) (OpenThreadsSummary, error)
	UpdateInboxState(ctx context.Context, memberID string, threadIDs []string, action InboxAction, snoozedUntil *time.Time) ([]ThreadParticipant, error)
	Assign(ctx context.Context, memberID, threadID string, assigneeID *string) error
}
