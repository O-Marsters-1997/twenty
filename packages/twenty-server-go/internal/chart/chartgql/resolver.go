package chartgql

import (
	"context"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/chart"
)

type Resolver struct {
	Charts *chart.Service
}

func (r *queryResolver) BarChartData(ctx context.Context, input BarChartDataInput) (*chart.BarChartData, error) {
	if principal, ok := auth.PrincipalFrom(ctx); !ok || principal.WorkspaceID == "" {
		return nil, auth.ErrUnauthenticated
	}
	configuration, ok := input.Configuration.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("%w: configuration must be an object", chart.ErrInvalidConfiguration)
	}
	data, err := r.Charts.BarChartData(ctx, input.ObjectMetadataID, configuration)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type queryResolver struct{ *Resolver }

func (r *barChartDataResolver) FormattedToRawLookup(_ context.Context, obj *chart.BarChartData) (any, error) {
	return obj.FormattedToRawLookup, nil
}

func (r *Resolver) BarChartData() BarChartDataResolver { return &barChartDataResolver{r} }

type barChartDataResolver struct{ *Resolver }
