package geogql

import (
	"context"
	"strings"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/geo"
)

type Resolver struct{ Driver geo.Driver }

func (r *queryResolver) GetAutoCompleteAddress(ctx context.Context, address string, token string, country *string, isFieldCity *bool) ([]*geo.Suggestion, error) {
	if r.Driver == nil || strings.TrimSpace(address) == "" {
		return []*geo.Suggestion{}, nil
	}
	found, err := r.Driver.Suggestions(ctx, address, token, deref(country), isFieldCity != nil && *isFieldCity)
	if err != nil {
		return nil, err
	}
	suggestions := make([]*geo.Suggestion, len(found))
	for i := range found {
		suggestions[i] = &found[i]
	}
	return suggestions, nil
}

func (r *queryResolver) GetAddressDetails(ctx context.Context, placeID string, token string) (*geo.Address, error) {
	if r.Driver == nil {
		return &geo.Address{}, nil
	}
	address, err := r.Driver.Details(ctx, placeID, token)
	if err != nil {
		return nil, err
	}
	return &address, nil
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type queryResolver struct{ *Resolver }

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
