package agentgql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
)

type Resolver struct {
	Agents *store.Agents
}

func (r *mutationResolver) CreateOneAgent(ctx context.Context, input map[string]any) (*ai.AgentRecord, error) {
	return pointer(r.Agents.Create(ctx, input))
}

func (r *mutationResolver) UpdateOneAgent(ctx context.Context, input map[string]any) (*ai.AgentRecord, error) {
	id, _ := input["id"].(string)
	delete(input, "id")
	return pointer(r.Agents.Update(ctx, id, input))
}

func (r *mutationResolver) DeleteOneAgent(ctx context.Context, input map[string]any) (*ai.AgentRecord, error) {
	id, _ := input["id"].(string)
	return pointer(r.Agents.Delete(ctx, id))
}

func (r *mutationResolver) AssignRoleToAgent(ctx context.Context, agentID string, roleID string) (bool, error) {
	if err := r.Agents.AssignRole(ctx, agentID, roleID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *queryResolver) FindManyAgents(ctx context.Context) ([]*ai.AgentRecord, error) {
	agents, err := r.Agents.List(ctx)
	if err != nil {
		return nil, err
	}
	listed := make([]*ai.AgentRecord, len(agents))
	for i := range agents {
		listed[i] = &agents[i]
	}
	return listed, nil
}

func (r *queryResolver) FindOneAgent(ctx context.Context, input map[string]any) (*ai.AgentRecord, error) {
	id, _ := input["id"].(string)
	return pointer(r.Agents.Get(ctx, id))
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func pointer(agent ai.AgentRecord, err error) (*ai.AgentRecord, error) {
	if err != nil {
		return nil, err
	}
	return &agent, nil
}
