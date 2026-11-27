package recordsgql

import (
	"context"
	"strconv"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

func (r *queryResolver) Search(ctx context.Context, searchInput string, limit int, after *string, excludedObjectNameSingulars, includedObjectNameSingulars []string, filter map[string]any) (*SearchResultConnection, error) {
	query := records.SearchQuery{
		Input: searchInput, Limit: limit, After: deref(after),
		Included: includedObjectNameSingulars, Excluded: excludedObjectNameSingulars,
	}
	if filter != nil {
		query.FilterFor = func(nameSingular string) (records.Filter, error) {
			return parseFilter(objectNamed(nameSingular), filter)
		}
	}
	page, err := r.Searcher.Search(ctx, query)
	if err != nil {
		return nil, err
	}
	connection := &SearchResultConnection{Edges: []*SearchResultEdge{}, PageInfo: &SearchResultPageInfo{HasNextPage: page.HasNextPage}}
	for _, hit := range page.Hits {
		connection.Edges = append(connection.Edges, &SearchResultEdge{Cursor: hit.Cursor, Node: &SearchRecord{
			RecordID: hit.RecordID, ObjectNameSingular: hit.ObjectNameSingular, ObjectLabelSingular: hit.ObjectLabelSingular,
			Label: hit.Label, ImageURL: hit.ImageURL, TsRankCd: shortest(hit.TsRankCD), TsRank: shortest(hit.TsRank),
		}})
	}
	if n := len(connection.Edges); n > 0 {
		connection.PageInfo.EndCursor = &connection.Edges[n-1].Cursor
	}
	return connection, nil
}

func shortest(value float32) float64 {
	parsed, _ := strconv.ParseFloat(strconv.FormatFloat(float64(value), 'g', -1, 32), 64)
	return parsed
}
