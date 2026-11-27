package usergql

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

func NewHandler(resolver *Resolver, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: resolver}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		if errors.Is(err, auth.ErrUnauthenticated) {
			presented.Extensions = map[string]any{"code": "UNAUTHENTICATED"}
			return presented
		}
		logger.Error("resolve graphql", "err", err)
		presented.Extensions = map[string]any{"code": "INTERNAL_SERVER_ERROR"}
		return presented
	})
	return server
}
