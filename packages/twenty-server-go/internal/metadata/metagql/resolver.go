package metagql

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
)

type Resolver struct {
	Views *store.Views
}

func (r *mutationResolver) CreateView(ctx context.Context, input map[string]any) (*metadata.ViewRecord, error) {
	values := numbersToFloats(input)
	if principal, ok := auth.PrincipalFrom(ctx); ok && principal.UserWorkspaceID != "" {
		values["createdByUserWorkspaceId"] = principal.UserWorkspaceID
	}
	return pointer(r.Views.Create(ctx, values))
}

func (r *mutationResolver) UpdateView(ctx context.Context, id string, input map[string]any) (*metadata.ViewRecord, error) {
	return pointer(r.Views.Update(ctx, id, withoutID(numbersToFloats(input))))
}

func (r *mutationResolver) DestroyView(ctx context.Context, id string) (bool, error) {
	return destroyed(r.Views.View.Destroy(ctx, id))
}

func (r *mutationResolver) CreateManyViewFields(ctx context.Context, inputs []map[string]any) ([]*metadata.ViewField, error) {
	return insertAll(ctx, r.Views.Fields, inputs)
}

func (r *mutationResolver) UpdateViewField(ctx context.Context, input map[string]any) (*metadata.ViewField, error) {
	id, updates := updateParts(input)
	return pointer(r.Views.Fields.Update(ctx, id, updates))
}

func (r *mutationResolver) DestroyViewField(ctx context.Context, input map[string]any) (*metadata.ViewField, error) {
	return pointer(r.Views.Fields.Destroy(ctx, idOf(input)))
}

func (r *mutationResolver) CreateViewFilter(ctx context.Context, input map[string]any) (*metadata.ViewFilter, error) {
	return pointer(r.Views.Filters.Insert(ctx, numbersToFloats(input)))
}

func (r *mutationResolver) UpdateViewFilter(ctx context.Context, input map[string]any) (*metadata.ViewFilter, error) {
	id, updates := updateParts(input)
	return pointer(r.Views.Filters.Update(ctx, id, updates))
}

func (r *mutationResolver) DestroyViewFilter(ctx context.Context, input map[string]any) (*metadata.ViewFilter, error) {
	return pointer(r.Views.Filters.Destroy(ctx, idOf(input)))
}

func (r *mutationResolver) CreateViewFilterGroup(ctx context.Context, input map[string]any) (*metadata.ViewFilterGroup, error) {
	return pointer(r.Views.FilterGroups.Insert(ctx, numbersToFloats(input)))
}

func (r *mutationResolver) UpdateViewFilterGroup(ctx context.Context, id string, input map[string]any) (*metadata.ViewFilterGroup, error) {
	return pointer(r.Views.FilterGroups.Update(ctx, id, withoutID(numbersToFloats(input))))
}

func (r *mutationResolver) DestroyViewFilterGroup(ctx context.Context, id string) (bool, error) {
	return destroyed(r.Views.FilterGroups.Destroy(ctx, id))
}

func (r *mutationResolver) CreateViewSort(ctx context.Context, input map[string]any) (*metadata.ViewSort, error) {
	return pointer(r.Views.Sorts.Insert(ctx, numbersToFloats(input)))
}

func (r *mutationResolver) UpdateViewSort(ctx context.Context, input map[string]any) (*metadata.ViewSort, error) {
	id, updates := updateParts(input)
	return pointer(r.Views.Sorts.Update(ctx, id, updates))
}

func (r *mutationResolver) DestroyViewSort(ctx context.Context, input map[string]any) (bool, error) {
	return destroyed(r.Views.Sorts.Destroy(ctx, idOf(input)))
}

func (r *mutationResolver) CreateManyViewGroups(ctx context.Context, inputs []map[string]any) ([]*metadata.ViewGroup, error) {
	return insertAll(ctx, r.Views.Groups, inputs)
}

func (r *mutationResolver) UpdateManyViewGroups(ctx context.Context, inputs []map[string]any) ([]*metadata.ViewGroup, error) {
	updated := make([]*metadata.ViewGroup, 0, len(inputs))
	for _, input := range inputs {
		id, updates := updateParts(input)
		group, err := r.Views.Groups.Update(ctx, id, updates)
		if err != nil {
			return nil, err
		}
		updated = append(updated, &group)
	}
	return updated, nil
}

func (r *queryResolver) GetViews(ctx context.Context, objectMetadataID *string, viewTypes []string) ([]*metadata.ViewRecord, error) {
	objectID := ""
	if objectMetadataID != nil {
		objectID = *objectMetadataID
	}
	views, err := r.Views.List(ctx, objectID, viewTypes)
	if err != nil {
		return nil, err
	}
	pointers := make([]*metadata.ViewRecord, len(views))
	for i := range views {
		pointers[i] = &views[i]
	}
	return pointers, nil
}

func (r *viewFilterResolver) Value(_ context.Context, filter *metadata.ViewFilter) (any, error) {
	var value any
	if err := json.Unmarshal(filter.Value, &value); err != nil {
		return nil, fmt.Errorf("decode view filter value: %w", err)
	}
	return value, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

func (r *Resolver) ViewFilter() ViewFilterResolver { return &viewFilterResolver{r} }

type (
	mutationResolver   struct{ *Resolver }
	queryResolver      struct{ *Resolver }
	viewFilterResolver struct{ *Resolver }
)

func pointer[TRow any](row TRow, err error) (*TRow, error) {
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func destroyed[TRow any](_ TRow, err error) (bool, error) {
	return err == nil, err
}

func insertAll[TRow any](ctx context.Context, rows store.Rows[TRow], inputs []map[string]any) ([]*TRow, error) {
	inserted := make([]*TRow, 0, len(inputs))
	for _, input := range inputs {
		row, err := rows.Insert(ctx, numbersToFloats(input))
		if err != nil {
			return nil, err
		}
		inserted = append(inserted, &row)
	}
	return inserted, nil
}

func idOf(input map[string]any) string {
	id, _ := input["id"].(string)
	return id
}

func updateParts(input map[string]any) (string, map[string]any) {
	updates, _ := input["update"].(map[string]any)
	return idOf(input), numbersToFloats(updates)
}

func withoutID(values map[string]any) map[string]any {
	delete(values, "id")
	return values
}

func numbersToFloats(values map[string]any) map[string]any {
	converted := make(map[string]any, len(values))
	for key, value := range values {
		converted[key] = value
		if number, ok := value.(json.Number); ok {
			if parsed, err := number.Float64(); err == nil {
				converted[key] = parsed
			}
		}
	}
	return converted
}
