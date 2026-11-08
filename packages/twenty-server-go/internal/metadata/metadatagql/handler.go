package metadatagql

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
)

// NewHandler serves the object metadata reads over GraphQL; the caller supplies the principal in the request context.
func NewHandler(pager Pager, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{Store: pager}}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, store.ErrInvalidPaging), presented.Path == nil:
			code = "BAD_USER_INPUT"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
