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
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
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
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		server.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), exchangeKey{}, exchange{w, r})))
	})
}

type exchangeKey struct{}

type exchange struct {
	w http.ResponseWriter
	r *http.Request
}

func exchangeFrom(ctx context.Context) (http.ResponseWriter, *http.Request) {
	current := ctx.Value(exchangeKey{}).(exchange)
	return current.w, current.r
}

func tokenPair(pair auth.TokenPair) *AuthTokenPair {
	return &AuthTokenPair{
		AccessOrWorkspaceAgnosticToken: &AuthToken{Token: pair.AccessToken, ExpiresAt: metadata.Timestamp{Time: pair.ExpiresAt}},
		RefreshToken:                   &AuthToken{Token: pair.RefreshToken, ExpiresAt: metadata.Timestamp{Time: pair.RefreshExpiresAt}},
	}
}

func principalFrom(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}
