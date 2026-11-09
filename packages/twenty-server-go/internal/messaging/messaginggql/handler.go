package messaginggql

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/messaging"
)

// NewHandler serves the timeline operations; the caller supplies the principal in the request context.
func NewHandler(resolver *Resolver, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: resolver}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, messaging.ErrInvalidTimelinePage):
			code = "BAD_USER_INPUT"
		case errors.Is(err, auth.ErrUnauthenticated):
			code = "UNAUTHENTICATED"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
