package onboardinggql

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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/onboarding"
)

func NewHandler(resolver *Resolver, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: resolver}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		switch {
		case errors.Is(err, auth.ErrUnauthenticated):
			presented.Extensions = map[string]any{"code": "UNAUTHENTICATED"}
		case errors.Is(err, onboarding.ErrNoPreviousStep):
			presented.Extensions = map[string]any{"code": "NO_PREVIOUS_ONBOARDING_STEP", "userFriendlyMessage": "There is no previous onboarding step to go back to."}
		default:
			logger.Error("resolve graphql", "err", err)
			presented.Extensions = map[string]any{"code": "INTERNAL_SERVER_ERROR"}
		}
		return presented
	})
	return server
}
