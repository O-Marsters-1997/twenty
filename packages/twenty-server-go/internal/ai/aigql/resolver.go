package aigql

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct {
	History ai.History
	Broker  ai.Broker
}

var errNoMember = errors.New("the request has no workspace member")

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

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func memberFrom(ctx context.Context) (string, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.WorkspaceMemberID == "" {
		return "", errNoMember
	}
	return principal.WorkspaceMemberID, nil
}

func convert[TModel any](value any) (*TModel, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode %T: %w", value, err)
	}
	var model TModel
	if err := json.Unmarshal(encoded, &model); err != nil {
		return nil, fmt.Errorf("decode %T: %w", model, err)
	}
	return &model, nil
}

func convertAll[TModel any, TValue any](values []TValue) ([]*TModel, error) {
	models := make([]*TModel, len(values))
	for i, value := range values {
		model, err := convert[TModel](value)
		if err != nil {
			return nil, err
		}
		models[i] = model
	}
	return models, nil
}
