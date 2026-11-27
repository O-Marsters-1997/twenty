package commandmenugql

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/commandmenu"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

func NewHandler(resolver *Resolver, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: resolver}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		switch {
		case errors.Is(err, auth.ErrUnauthenticated):
			presented.Extensions = map[string]any{"code": "UNAUTHENTICATED"}
		case errors.Is(err, commandmenu.ErrPermissionDenied):
			presented.Extensions = map[string]any{"code": "FORBIDDEN"}
		case errors.Is(err, metadata.ErrNotFound):
			presented.Extensions = map[string]any{"code": "NOT_FOUND"}
		case errors.Is(err, metadata.ErrInvalidInput):
			presented.Extensions = map[string]any{"code": "BAD_USER_INPUT"}
		default:
			logger.Error("resolve graphql", "err", err)
			presented.Extensions = map[string]any{"code": "INTERNAL_SERVER_ERROR"}
		}
		return presented
	})
	return server
}
