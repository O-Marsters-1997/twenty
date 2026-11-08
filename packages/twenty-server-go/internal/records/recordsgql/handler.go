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

type Stores struct {
	People           records.People
	WorkspaceMembers records.WorkspaceMembers
	Dashboards       records.Dashboards
}

func NewHandler(stores Stores, logger *slog.Logger) http.Handler {
	resolver := &Resolver{
		people: newObjectOps[records.Person, records.PersonInput, Person](stores.People, "person",
			func(person records.Person) string { return person.ID }, toPerson),
		workspaceMembers: newObjectOps[records.WorkspaceMember, records.WorkspaceMemberInput, WorkspaceMember](stores.WorkspaceMembers, "workspaceMember",
			func(member records.WorkspaceMember) string { return member.ID }, toWorkspaceMember),
		dashboards: newObjectOps[records.Dashboard, records.DashboardInput, Dashboard](stores.Dashboards, "dashboard",
			func(dashboard records.Dashboard) string { return dashboard.ID }, toDashboard),
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
