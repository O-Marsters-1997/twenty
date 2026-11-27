package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

type searchSpec struct {
	nameSingular string
	label        string
	image        string
}

const (
	noImage        = "NULL::text"
	maxSearchLimit = 1000
)

var searchSpecs = []searchSpec{
	{"company", `"name"`, noImage},
	{"person", `trim(concat("nameFirstName", ' ', "nameLastName"))`, `NULLIF("avatarUrl", '')`},
	{"opportunity", `"name"`, noImage},
	{"note", `"title"`, noImage},
	{"task", `"title"`, noImage},
	{"dashboard", `"title"`, noImage},
	{"workflow", `"name"`, noImage},
	{"workspaceMember", `trim(concat("nameFirstName", ' ', "nameLastName"))`, `NULLIF("avatarUrl", '')`},
}

type Search struct {
	pool *pgxpool.Pool
}

var _ records.Searcher = (*Search)(nil)

func NewSearch(pool *pgxpool.Pool) *Search {
	return &Search{pool: pool}
}

type searchCursor struct {
	ID     string  `json:"id"`
	RankCD float32 `json:"rankCD"`
	Rank   float32 `json:"rank"`
}

func (s *Search) Search(ctx context.Context, query records.SearchQuery) (records.SearchPage, error) {
	if query.Limit < 1 || query.Limit > maxSearchLimit {
		return records.SearchPage{}, fmt.Errorf("%w: search limit must be between 1 and %d", records.ErrUnknownField, maxSearchLimit)
	}
	after, err := decodeSearchCursor(query.After)
	if err != nil {
		return records.SearchPage{}, err
	}
	labels, err := s.objectLabels(ctx)
	if err != nil {
		return records.SearchPage{}, err
	}
	var hits []records.SearchHit
	for _, spec := range searchSpecs {
		if len(query.Included) > 0 && !slices.Contains(query.Included, spec.nameSingular) || slices.Contains(query.Excluded, spec.nameSingular) {
			continue
		}
		found, err := s.searchObject(ctx, spec, labels[spec.nameSingular], query, after)
		if err != nil {
			return records.SearchPage{}, err
		}
		hits = append(hits, found...)
	}
	slices.SortFunc(hits, func(a, b records.SearchHit) int {
		switch {
		case a.TsRankCD != b.TsRankCD:
			return cmpFloat(b.TsRankCD, a.TsRankCD)
		case a.TsRank != b.TsRank:
			return cmpFloat(b.TsRank, a.TsRank)
		}
		return strings.Compare(a.RecordID, b.RecordID)
	})
	page := records.SearchPage{}
	if len(hits) > query.Limit {
		hits, page.HasNextPage = hits[:query.Limit], true
	}
	page.Hits = hits
	return page, nil
}

func cmpFloat(a, b float32) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	}
	return 0
}

func (s *Search) objectLabels(ctx context.Context) (map[string]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT "nameSingular", "labelSingular" FROM core."objectMetadata" WHERE "workspaceId" = $1::uuid`, workspace.PinnedWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("query object labels: %w", err)
	}
	labels := map[string]string{}
	for rows.Next() {
		var name, label string
		if err := rows.Scan(&name, &label); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan object label: %w", err)
		}
		labels[name] = label
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read object labels: %w", err)
	}
	return labels, nil
}

func (s *Search) searchObject(ctx context.Context, spec searchSpec, objectLabel string, query records.SearchQuery, after *searchCursor) ([]records.SearchHit, error) {
	index := slices.IndexFunc(model.Objects, func(candidate model.Object) bool { return candidate.NameSingular == spec.nameSingular })
	if index < 0 {
		return nil, fmt.Errorf("search %s: object missing from the model", spec.nameSingular)
	}
	object := model.Objects[index]
	where := &compiler{object: object}
	var conditions []string
	if query.FilterFor != nil {
		filter, err := query.FilterFor(spec.nameSingular)
		if err != nil {
			return nil, err
		}
		condition, err := where.filter(filter)
		if err != nil {
			return nil, err
		}
		if condition != "" {
			conditions = append(conditions, "("+condition+")")
		}
	}
	if !where.mentionsDeletedAt {
		conditions = append(conditions, `"deletedAt" IS NULL`)
	}

	rankCD, rank := "0::float4", "0::float4"
	terms := searchTerms(query.Input)
	if terms == "" && strings.TrimSpace(query.Input) != "" {
		return nil, nil
	}
	if terms != "" {
		tsQuery := where.arg(terms) + "::text"
		pattern := where.arg("%" + escapeLike(strings.TrimSpace(query.Input)) + "%")
		rankCD = `ts_rank_cd("searchVector", to_tsquery('simple', ` + tsQuery + `))::float4`
		rank = `ts_rank("searchVector", to_tsquery('simple', ` + tsQuery + `))::float4`
		conditions = append(conditions, `("searchVector" @@ to_tsquery('simple', `+tsQuery+`) OR `+spec.label+` ILIKE `+pattern+`)`)
	}
	outer := ""
	if after != nil {
		cd, r, id := where.arg(after.RankCD), where.arg(after.Rank), where.arg(after.ID)
		outer = ` WHERE (hit.rank_cd < ` + cd + `::float4 OR (hit.rank_cd = ` + cd + `::float4 AND (hit.rank < ` + r + `::float4 OR (hit.rank = ` + r + `::float4 AND hit.id > ` + id + `::text))))`
	}
	statement := `SELECT * FROM (SELECT "id"::text AS id, COALESCE(` + spec.label + `, '') AS label, ` + spec.image + ` AS image, ` + rankCD + ` AS rank_cd, ` + rank + ` AS rank
		FROM ` + workspace.SchemaName() + `."` + object.Table + `" WHERE ` + orElse(strings.Join(conditions, " AND "), "TRUE") + `) hit` + outer +
		` ORDER BY hit.rank_cd DESC, hit.rank DESC, hit.id LIMIT ` + fmt.Sprint(query.Limit+1)
	rows, err := s.pool.Query(ctx, statement, where.args...)
	if err != nil {
		return nil, fmt.Errorf("search %s: %w", spec.nameSingular, err)
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (records.SearchHit, error) {
		hit := records.SearchHit{ObjectNameSingular: spec.nameSingular, ObjectLabelSingular: objectLabel}
		if err := row.Scan(&hit.RecordID, &hit.Label, &hit.ImageURL, &hit.TsRankCD, &hit.TsRank); err != nil {
			return hit, fmt.Errorf("scan %s hit: %w", spec.nameSingular, err)
		}
		cursor, err := json.Marshal(searchCursor{ID: hit.RecordID, RankCD: hit.TsRankCD, Rank: hit.TsRank})
		if err != nil {
			return hit, fmt.Errorf("encode search cursor: %w", err)
		}
		hit.Cursor = base64.StdEncoding.EncodeToString(cursor)
		return hit, nil
	})
}

func decodeSearchCursor(cursor string) (*searchCursor, error) {
	if cursor == "" {
		return nil, nil
	}
	raw, err := base64.StdEncoding.DecodeString(cursor)
	var decoded searchCursor
	if err == nil {
		err = json.Unmarshal(raw, &decoded)
	}
	if err != nil || decoded.ID == "" {
		return nil, fmt.Errorf("%w: invalid search cursor", records.ErrUnknownField)
	}
	return &decoded, nil
}

func searchTerms(input string) string {
	words := strings.FieldsFunc(input, func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) })
	for i, word := range words {
		words[i] = word + ":*"
	}
	return strings.Join(words, " & ")
}

func escapeLike(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}
