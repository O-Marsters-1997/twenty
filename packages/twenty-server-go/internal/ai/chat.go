package ai

import (
	"context"
	"encoding/json"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

type Runner interface { // shared by chat turns and, from phase 4, workflow agent steps
	Run(ctx context.Context, principal auth.Principal, agent Agent, messages []Message, emit func(ChatEvent)) ([]Message, error)
}

// ChatEvent is one AI SDK UI message chunk of a thread's turn.
type ChatEvent struct {
	ThreadID string
	Event    json.RawMessage // AI SDK UI message chunk, as onAgentChatEvent sends it today
}

// Broker fans a thread's chat events out to its subscribers.
type Broker interface {
	Publish(threadID string, event ChatEvent)
	Subscribe(ctx context.Context, threadID string) <-chan ChatEvent
	Catchup(threadID string) []ChatEvent // events of the turn in flight; empty when idle
}

// Agent is a configured AI agent.
type Agent struct {
	ID, Name, Label, Prompt, ModelID string
	ResponseFormat                   json.RawMessage
	SkillIDs                         []string
}

// Skill is reusable instruction content attached to agents.
type Skill struct {
	ID, Name, Label, Content string
}
