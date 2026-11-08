package agentgql

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

// Operations are the /metadata operations this handler serves.
var Operations = []string{"FindManyAgents", "FindOneAgent", "CreateOneAgent", "UpdateOneAgent", "DeleteOneAgent", "AssignRoleToAgent"}

func NewHandler(agents *store.Agents, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{Agents: agents}}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, metadata.ErrInvalidInput):
			code = "BAD_USER_INPUT"
		case errors.Is(err, metadata.ErrNotFound):
			code = "NOT_FOUND"
		case errors.Is(err, ai.ErrForbidden):
			code = "FORBIDDEN"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
