package aigql

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	History ai.History
	Broker  ai.Broker
	Turns   *ai.ChatService
}

func (r *mutationResolver) UpdateAgentChatThreadInboxState(ctx context.Context, threadIds []string, action string, snoozedUntil *metadata.Timestamp) ([]*AgentChatThreadParticipant, error) {
	memberID, err := memberFrom(ctx)
	if err != nil {
		return nil, err
	}
	var until *time.Time
	if snoozedUntil != nil {
		until = &snoozedUntil.Time
	}
	participants, err := r.History.UpdateInboxState(ctx, memberID, threadIds, ai.InboxAction(action), until)
	if err != nil {
		return nil, err
	}
	return convertAll[AgentChatThreadParticipant](participants)
}

func (r *mutationResolver) AssignAgentChatThread(ctx context.Context, threadID string, assigneeWorkspaceMemberID *string) (bool, error) {
	memberID, err := memberFrom(ctx)
	if err != nil {
		return false, err
	}
	if err := r.History.Assign(ctx, memberID, threadID, assigneeWorkspaceMemberID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) SendChatMessage(ctx context.Context, threadID string, text string, messageID string, browsingContext any, modelID *string, fileAttachments []*FileAttachmentInput, mentionedWorkspaceMemberIds []string) (*SendChatMessageResult, error) {
	principal, err := principalWithMember(ctx)
	if err != nil {
		return nil, err
	}
	files := make([]ai.FileAttachment, len(fileAttachments))
	for i, file := range fileAttachments {
		files[i] = ai.FileAttachment{ID: file.ID, Filename: file.Filename}
	}
	result, err := r.Turns.Send(ctx, principal, ai.SendInput{ThreadID: threadID, MessageID: messageID, Text: text, Files: files})
	if err != nil {
		return nil, err
	}
	return &SendChatMessageResult{
		MessageID: result.MessageID, Queued: result.Queued, StreamID: result.StreamID,
		MentionedParticipantWorkspaceMemberIds: []string{},
	}, nil
}

func (r *mutationResolver) RetryChatMessage(ctx context.Context, threadID string, modelID *string) (*SendChatMessageResult, error) {
	principal, err := principalWithMember(ctx)
	if err != nil {
		return nil, err
	}
	result, err := r.Turns.Retry(ctx, principal, threadID)
	if err != nil {
		return nil, err
	}
	return &SendChatMessageResult{MessageID: result.MessageID, Queued: result.Queued, StreamID: result.StreamID}, nil
}

func (r *mutationResolver) StopAgentChatStream(ctx context.Context, threadID string) (bool, error) {
	if _, err := memberFrom(ctx); err != nil {
		return false, err
	}
	r.Turns.Stop(threadID)
	return true, nil
}

func (r *mutationResolver) DeleteQueuedChatMessage(ctx context.Context, messageID string) (bool, error) {
	if _, err := memberFrom(ctx); err != nil {
		return false, err
	}
	return r.Turns.DeleteQueued(ctx, messageID)
}

func (r *mutationResolver) AnswerToolCall(ctx context.Context, input AnswerToolCallInput) (*AnswerToolCallResult, error) {
	principal, err := principalWithMember(ctx)
	if err != nil {
		return nil, err
	}
	response, err := json.Marshal(input.Response)
	if err != nil {
		return nil, fmt.Errorf("encode tool call response: %w", err)
	}
	streamID, err := r.Turns.Answer(ctx, principal, input.ThreadID, input.ToolCallID, response)
	if err != nil {
		return nil, err
	}
	return &AnswerToolCallResult{StreamID: streamID}, nil
}

func (r *queryResolver) ChatMessages(ctx context.Context, threadID string) ([]*AgentMessage, error) {
	messages, err := r.History.SettledMessages(ctx, threadID)
	if err != nil {
		return nil, err
	}
	return convertAll[AgentMessage](messages)
}

func (r *queryResolver) ChatStreamCatchupChunks(ctx context.Context, threadID string) (*ChatStreamCatchupChunks, error) {
	events := r.Broker.Catchup(threadID)
	chunks := make([]any, len(events))
	for i, event := range events {
		if err := json.Unmarshal(event.Event, &chunks[i]); err != nil {
			return nil, fmt.Errorf("decode chunk: %w", err)
		}
	}
	turnError, err := r.History.LatestTurnError(ctx, threadID)
	if err != nil {
		return nil, err
	}
	catchup := &ChatStreamCatchupChunks{Chunks: chunks, MaxSeq: len(chunks)}
	if turnError != nil {
		catchup.Error = &ChatStreamError{Code: turnError.Code, Message: turnError.Message}
	}
	return catchup, nil
}

func (r *queryResolver) AgentChatOpenThreadsSummary(ctx context.Context) (*AgentChatOpenThreadsSummary, error) {
	memberID, err := memberFrom(ctx)
	if err != nil {
		return nil, err
	}
	summary, err := r.History.OpenThreadsSummary(ctx, memberID)
	if err != nil {
		return nil, err
	}
	return convert[AgentChatOpenThreadsSummary](summary)
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
