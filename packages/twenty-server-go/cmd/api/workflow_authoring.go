package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	aistore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow"
	workflowstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/workflow/store"
)

const workspaceDefaultModelID = "workspace-default-model"

func workflowAuthoring(pool *pgxpool.Pool) *workflow.Authoring {
	agents := aistore.NewAgents(pool)
	return &workflow.Authoring{
		Store: workflowstore.New(pool),
		NewAgent: func(ctx context.Context) (string, error) {
			agent, err := agents.Create(ctx, map[string]any{
				"label":          "Workflow Agent " + uuid.NewString()[:4],
				"icon":           "IconLego",
				"description":    "",
				"prompt":         "You are a helpful AI assistant. Complete the task based on the workflow context.",
				"modelId":        workspaceDefaultModelID,
				"responseFormat": map[string]any{"type": "text"},
			})
			if err != nil {
				return "", fmt.Errorf("create agent: %w", err)
			}
			return agent.ID, nil
		},
		CloneAgent: func(ctx context.Context, agentID string) (string, error) {
			source, err := agents.Get(ctx, agentID)
			if err != nil {
				return "", fmt.Errorf("get agent: %w", err)
			}
			cloned, err := agents.Create(ctx, map[string]any{
				"label": source.Label + " " + uuid.NewString()[:4], "icon": source.Icon, "description": source.Description, "prompt": source.Prompt,
				"modelId": source.ModelID, "responseFormat": source.ResponseFormat, "modelConfiguration": source.ModelConfiguration,
			})
			if err != nil {
				return "", fmt.Errorf("create agent: %w", err)
			}
			return cloned.ID, nil
		},
	}
}
