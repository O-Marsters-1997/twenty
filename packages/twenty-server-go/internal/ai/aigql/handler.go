package aigql

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
)

func NewHandler(history ai.History, broker ai.Broker, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{History: history, Broker: broker}}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, ai.ErrThreadNotFound):
			code = "NOT_FOUND"
		case errors.Is(err, ai.ErrSnoozeTimeNotInFuture):
			code = "BAD_USER_INPUT"
		case errors.Is(err, ai.ErrAssigneeCannotUnsubscribe):
			code = "CONFLICT"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
