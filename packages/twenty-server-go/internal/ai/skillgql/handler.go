package skillgql

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

func NewHandler(skills *ai.Skills, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{Store: skills}}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, metadata.ErrInvalidInput):
			code = "BAD_USER_INPUT"
		case errors.Is(err, metadata.ErrNotFound):
			code = "NOT_FOUND"
		case errors.Is(err, ai.ErrSkillStandard):
			code = "FORBIDDEN"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
