package main

import (
	"errors"
	"fmt"
	"log/slog"
	"os"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
)

func chatRunner(registry ai.Registry, logger *slog.Logger) (ai.Runner, error) {
	modelConfig, err := ai.ModelConfigFromEnv(os.Getenv)
	if errors.Is(err, ai.ErrNoModelConfigured) {
		logger.Warn("ai chat disabled", "err", err)
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("select chat model: %w", err)
	}
	model, err := ai.NewModel(modelConfig)
	if err != nil {
		return nil, fmt.Errorf("create chat model: %w", err)
	}
	return ai.NewLoop(model, registry), nil
}
