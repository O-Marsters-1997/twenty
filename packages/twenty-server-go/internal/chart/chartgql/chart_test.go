package chartgql_test

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/chart"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/chart/chartgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type staticReader []metadata.ObjectMetadata

func (r staticReader) Objects(context.Context) ([]metadata.ObjectMetadata, error) { return r, nil }

type groupsByDimensions struct{}

func (groupsByDimensions) GroupBy(_ context.Context, query records.GroupByQuery) ([]records.GroupRow, error) {
	if len(query.Dimensions) == 2 {
		return []records.GroupRow{
			{Keys: []any{"NEW", "2024-01-01"}, Value: int64(3)},
			{Keys: []any{"WON", "2024-02-01"}, Value: int64(2)},
		}, nil
	}
	if query.Dimensions[0].FieldID == "f-close" {
		return []records.GroupRow{{Keys: []any{"2024-01-01"}, Value: int64(3)}, {Keys: []any{"2024-02-01"}, Value: int64(2)}}, nil
	}
	return []records.GroupRow{{Keys: []any{"NEW"}, Value: int64(3)}, {Keys: []any{"WON"}, Value: int64(2)}}, nil
}

func handler() http.Handler {
	service := &chart.Service{
		Metadata: staticReader{{
			ID: "o-opportunity", NameSingular: "opportunity",
			Fields: []metadata.FieldMetadata{
				{ID: "f-id", Name: "id", Label: "Id", Type: model.TypeUUID},
				{ID: "f-stage", Name: "stage", Label: "Stage", Type: model.TypeSelect, Options: []byte(`[{"value":"NEW","label":"New"},{"value":"WON","label":"Won"}]`)},
				{ID: "f-close", Name: "closeDate", Label: "Close date", Type: model.TypeDateTime},
			},
		}},
		NewGrouper: func(model.Object, []records.FieldMetadata) chart.Grouper { return groupsByDimensions{} },
	}
	graphql := chartgql.NewHandler(&chartgql.Resolver{Charts: service}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal := auth.Principal{UserID: "u", WorkspaceID: "w"}
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func TestPieChartData_MatchesGolden(t *testing.T) {
	t.Parallel()
	golden.Assert(t, handler(), "testdata", "PieChartData")
}

func TestBarChartData_MatchesGolden(t *testing.T) {
	t.Parallel()
	for _, name := range []string{"BarChartData", "BarChartDataTwoDimensionsCumulative"} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			golden.Assert(t, handler(), "testdata", name)
		})
	}
}
