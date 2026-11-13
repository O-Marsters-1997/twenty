package authgql

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
		var twoFactorErr *auth.TwoFactorError
		switch {
		case errors.As(err, &twoFactorErr):
			presented.Message = twoFactorErr.Message
			presented.Extensions = map[string]any{
				"code":                twoFactorErr.Code,
				"subCode":             twoFactorErr.SubCode,
				"userFriendlyMessage": twoFactorErr.FriendlyMessage,
			}
		case errors.Is(err, auth.ErrUnauthenticated):
			presented.Extensions = map[string]any{"code": "UNAUTHENTICATED"}
		default:
			logger.Error("resolve graphql", "err", err)
			presented.Extensions = map[string]any{"code": "INTERNAL_SERVER_ERROR"}
		}
		return presented
	})
	return server
}
