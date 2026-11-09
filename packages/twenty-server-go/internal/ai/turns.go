package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	chunkQueueUpdated = "queue-updated"

	systemPrompt = "You are the AI assistant of a personal CRM. Use the available tools to look up and " +
		"change the user's records, and answer concisely."
)

var (
	ErrMessageNotFound    = errors.New("chat message not found")
	ErrToolCallNotFound   = errors.New("tool call not found")
	ErrToolCallNotPending = errors.New("tool call is not waiting for an answer")
	ErrNoFailedTurn       = errors.New("no failed turn to retry")
)

type FileAttachment struct {
	ID, Filename string
}

type NewMessage struct {
	ID, ThreadID, MemberID, Text string
	Files                        []FileAttachment
	Queued                       bool
}

type ChatStore interface {
	EnsureThread(ctx context.Context, threadID, memberID string) error
	AddMessage(ctx context.Context, message NewMessage) error
	Conversation(ctx context.Context, threadID string) ([]Message, error)
	QueuedMessageThread(ctx context.Context, messageID string) (string, error)
	DeleteQueuedMessage(ctx context.Context, messageID string) (bool, error)
	PromoteQueuedMessage(ctx context.Context, threadID string) (bool, error)
	DiscardFailedTurn(ctx context.Context, threadID string) error
	AnswerToolCall(ctx context.Context, threadID, toolCallID string, output json.RawMessage) (stillPending int, err error)
}

type SendResult struct {
	MessageID *string
	Queued    bool
	StreamID  *string
}

type SendInput struct {
	ThreadID, MessageID, Text string
	Files                     []FileAttachment
}

// ChatService runs chat turns on a Runner in the background and queues messages
// sent while a turn is in flight. Chunks reach subscribers through the Broker.
type ChatService struct {
	store  ChatStore
	runner Runner
	broker Broker
	logger *slog.Logger

	mu     sync.Mutex
	active map[string]context.CancelFunc
}

func NewChatService(store ChatStore, runner Runner, broker Broker, logger *slog.Logger) *ChatService {
	return &ChatService{store: store, runner: runner, broker: broker, logger: logger, active: map[string]context.CancelFunc{}}
}

func (s *ChatService) Send(ctx context.Context, principal auth.Principal, input SendInput) (SendResult, error) {
	if s.runner == nil {
		return SendResult{}, ErrNoModelConfigured
	}
	if err := s.store.EnsureThread(ctx, input.ThreadID, principal.WorkspaceMemberID); err != nil {
		return SendResult{}, fmt.Errorf("ensure thread: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	_, busy := s.active[input.ThreadID]
	err := s.store.AddMessage(ctx, NewMessage{
		ID: input.MessageID, ThreadID: input.ThreadID, MemberID: principal.WorkspaceMemberID,
		Text: input.Text, Files: input.Files, Queued: busy,
	})
	if err != nil {
		return SendResult{}, fmt.Errorf("add message: %w", err)
	}
	if busy {
		s.publishQueueUpdated(input.ThreadID)
		return SendResult{MessageID: &input.MessageID, Queued: true}, nil
	}
	return SendResult{MessageID: &input.MessageID, StreamID: s.launch(principal, input.ThreadID)}, nil
}

func (s *ChatService) Retry(ctx context.Context, principal auth.Principal, threadID string) (SendResult, error) {
	if s.runner == nil {
		return SendResult{}, ErrNoModelConfigured
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, busy := s.active[threadID]; busy {
		return SendResult{}, ErrNoFailedTurn
	}
	if err := s.store.DiscardFailedTurn(ctx, threadID); err != nil {
		return SendResult{}, err
	}
	return SendResult{StreamID: s.launch(principal, threadID)}, nil
}

func (s *ChatService) Stop(threadID string) {
	s.mu.Lock()
	cancel := s.active[threadID]
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (s *ChatService) DeleteQueued(ctx context.Context, messageID string) (bool, error) {
	threadID, err := s.store.QueuedMessageThread(ctx, messageID)
	if err != nil {
		return false, err
	}
	deleted, err := s.store.DeleteQueuedMessage(ctx, messageID)
	if err != nil {
		return false, err
	}
	if deleted {
		s.publishQueueUpdated(threadID)
	}
	return deleted, nil
}

func (s *ChatService) Answer(ctx context.Context, principal auth.Principal, threadID, toolCallID string, response json.RawMessage) (*string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, busy := s.active[threadID]; busy {
		return nil, ErrToolCallNotPending
	}
	stillPending, err := s.store.AnswerToolCall(ctx, threadID, toolCallID, response)
	if err != nil || stillPending > 0 || s.runner == nil {
		return nil, err
	}
	return s.launch(principal, threadID), nil
}

func (s *ChatService) launch(principal auth.Principal, threadID string) *string {
	ctx, cancel := context.WithCancel(context.Background())
	s.active[threadID] = cancel
	go func() {
		defer cancel()
		s.runTurnRecovering(ctx, principal, threadID)
		s.finish(principal, threadID, ctx.Err() != nil)
	}()
	streamID := uuid.NewString()
	return &streamID
}

func (s *ChatService) finish(principal auth.Principal, threadID string, stopped bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.active, threadID)
	if stopped {
		return
	}
	promoted, err := s.store.PromoteQueuedMessage(context.Background(), threadID)
	if err != nil {
		s.logger.Error("promote queued message", "thread_id", threadID, "err", err)
		return
	}
	if promoted {
		s.publishQueueUpdated(threadID)
		s.launch(principal, threadID)
	}
}

func (s *ChatService) runTurnRecovering(ctx context.Context, principal auth.Principal, threadID string) {
	defer func() {
		if recovered := recover(); recovered != nil {
			s.logger.Error("chat turn panicked", "thread_id", threadID, "panic", fmt.Sprint(recovered))
			s.broker.Publish(threadID, ChatEvent{ThreadID: threadID, Event: json.RawMessage(`{"type":"error","errorText":"The response failed"}`)})
		}
	}()
	s.runTurn(ctx, principal, threadID)
}

func (s *ChatService) runTurn(ctx context.Context, principal auth.Principal, threadID string) {
	assistantMessageID := uuid.NewString()
	emit := func(event ChatEvent) {
		event.ThreadID = threadID
		if chunkType(event) == chunkStart {
			event.Event = withMessageID(event.Event, assistantMessageID)
		}
		s.broker.Publish(threadID, event)
	}

	messages, err := s.store.Conversation(ctx, threadID)
	if err != nil {
		s.logger.Error("load conversation", "thread_id", threadID, "err", err)
		emit(ChatEvent{Event: json.RawMessage(`{"type":"error","errorText":"Could not load the conversation"}`)})
		return
	}
	if _, err := s.runner.Run(ctx, principal, Agent{Prompt: systemPrompt}, messages, emit); err != nil && ctx.Err() == nil {
		s.logger.Warn("chat turn failed", "thread_id", threadID, "err", err)
	}
}

func (s *ChatService) publishQueueUpdated(threadID string) {
	s.broker.Publish(threadID, ChatEvent{ThreadID: threadID, Event: json.RawMessage(`{"type":"` + chunkQueueUpdated + `"}`)})
}

func withMessageID(chunk json.RawMessage, messageID string) json.RawMessage {
	fields := map[string]json.RawMessage{}
	if err := json.Unmarshal(chunk, &fields); err != nil {
		return chunk
	}
	quoted, err := json.Marshal(messageID)
	if err != nil {
		return chunk
	}
	fields["messageId"] = quoted
	encoded, err := json.Marshal(fields)
	if err != nil {
		return chunk
	}
	return encoded
}
