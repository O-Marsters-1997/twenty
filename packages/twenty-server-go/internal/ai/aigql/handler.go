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

func NewHandler(history ai.History, broker ai.Broker, turns *ai.ChatService, logger *slog.Logger) http.Handler {
	server := handler.New(NewExecutableSchema(Config{Resolvers: &Resolver{History: history, Broker: broker, Turns: turns}}))
	server.AddTransport(transport.POST{})
	server.SetErrorPresenter(func(ctx context.Context, err error) *gqlerror.Error {
		presented := graphql.DefaultErrorPresenter(ctx, err)
		code, subCode := "INTERNAL_SERVER_ERROR", ""
		switch {
		case errors.Is(err, ai.ErrThreadNotFound):
			code = "NOT_FOUND"
		case errors.Is(err, ai.ErrMessageNotFound):
			code, subCode = "NOT_FOUND", "MESSAGE_NOT_FOUND"
		case errors.Is(err, ai.ErrToolCallNotFound):
			code, subCode = "NOT_FOUND", "TOOL_CALL_NOT_FOUND"
		case errors.Is(err, ai.ErrToolCallNotPending):
			code, subCode = "BAD_USER_INPUT", "TOOL_CALL_NOT_PENDING"
		case errors.Is(err, ai.ErrNoFailedTurn):
			code, subCode = "CONFLICT", "NO_FAILED_TURN_TO_RETRY"
		case errors.Is(err, ai.ErrSnoozeTimeNotInFuture):
			code = "BAD_USER_INPUT"
		case errors.Is(err, ai.ErrAssigneeCannotUnsubscribe):
			code = "CONFLICT"
		case errors.Is(err, ai.ErrNoModelConfigured):
			subCode = "API_KEY_NOT_CONFIGURED"
		default:
			logger.Error("resolve graphql", "err", err)
		}
		presented.Extensions = map[string]any{"code": code}
		if subCode != "" {
			presented.Extensions["subCode"] = subCode
		}
		return presented
	})
	return server
}
