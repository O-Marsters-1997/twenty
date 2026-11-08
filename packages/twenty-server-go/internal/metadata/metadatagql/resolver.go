package metadatagql

import (
	"context"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type Pager interface {
	Page(ctx context.Context, request store.PageRequest) (store.Page, error)
}

type Resolver struct {
	Store Pager
}

func (r *queryResolver) Objects(ctx context.Context, paging *CursorPaging) (*ObjectConnection, error) {
	var request store.PageRequest
	if paging != nil {
		request.First, request.Last = paging.First, paging.Last
		request.After, request.Before = deref(paging.After), deref(paging.Before)
	}
	page, err := r.Store.Page(ctx, request)
	if err != nil {
		return nil, err
	}
	connection := &ObjectConnection{PageInfo: &PageInfo{HasNextPage: &page.HasNext, HasPreviousPage: &page.HasPrevious}}
	for i := range page.Objects {
		connection.Edges = append(connection.Edges, &ObjectEdge{Node: &page.Objects[i], Cursor: records.Cursor(page.Objects[i].ID)})
	}
	if connection.Edges == nil {
		connection.Edges = []*ObjectEdge{}
		return connection, nil
	}
	start, end := connection.Edges[0].Cursor, connection.Edges[len(connection.Edges)-1].Cursor
	connection.PageInfo.StartCursor, connection.PageInfo.EndCursor = &start, &end
	return connection, nil
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type queryResolver struct{ *Resolver }

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
