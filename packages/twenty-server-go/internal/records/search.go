package records

import "context"

type SearchQuery struct {
	Input     string
	Limit     int
	After     string
	Included  []string
	Excluded  []string
	FilterFor func(nameSingular string) (Filter, error)
}

type SearchHit struct {
	RecordID            string
	ObjectNameSingular  string
	ObjectLabelSingular string
	Label               string
	ImageURL            *string
	TsRankCD            float32
	TsRank              float32
	Cursor              string
}

type SearchPage struct {
	Hits        []SearchHit
	HasNextPage bool
}

type Searcher interface {
	Search(ctx context.Context, query SearchQuery) (SearchPage, error)
}
