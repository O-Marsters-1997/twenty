package recordsgql

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

// NewHandler serves the Person operations over GraphQL; the caller supplies the principal in the request context.
func NewHandler(stores Stores, logger *slog.Logger) http.Handler {
	resolver := &Resolver{
		Store:              stores.People,
		timelineActivities: newTimelineActivityOps(stores.TimelineActivities),
		attachments:        newAttachmentOps(stores.Attachments),
	}
	server := handler.New(NewExecutableSchema(Config{Resolvers: resolver}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code := "INTERNAL_SERVER_ERROR"
		switch {
		case errors.Is(err, records.ErrUnknownField):
			code = "BAD_USER_INPUT"
		case errors.Is(err, records.ErrNotFound):
			code = "NOT_FOUND"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		return presented
	})
	return server
}
