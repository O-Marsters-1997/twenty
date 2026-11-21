package store_test

import (
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ownerObject = model.Object{
		NameSingular: "chartOwner", NamePlural: "chartOwners", Table: "chartOwner",
		Fields: []model.Field{
			{Name: "id", Type: model.TypeUUID, Columns: []model.Column{{Name: "id"}}},
			{Name: "name", Type: model.TypeText, Columns: []model.Column{{Name: "name"}}},
			{Name: "address", Type: model.TypeAddress, Columns: []model.Column{{Name: "addressCountry", SubField: "addressCountry"}}},
		},
	}
	chartObject = model.Object{
		NameSingular: "chartItem", NamePlural: "chartItems", Table: "chartItem",
		Fields: []model.Field{
			{Name: "id", Type: model.TypeUUID, Columns: []model.Column{{Name: "id"}}},
			{Name: "stage", Type: model.TypeSelect, Columns: []model.Column{{Name: "stage"}}, Options: []string{"NEW", "WON", "LOST"}},
			{Name: "tags", Type: model.TypeMultiSelect, Columns: []model.Column{{Name: "tags"}}, Options: []string{"hot", "cold", "warm"}},
			{Name: "closedAt", Type: model.TypeDateTime, Columns: []model.Column{{Name: "closedAt"}}},
			{Name: "amount", Type: model.TypeNumber, Columns: []model.Column{{Name: "amount"}}},
			{Name: "region", Type: model.TypeAddress, Columns: []model.Column{{Name: "regionCountry", SubField: "addressCountry"}}},
			{Name: "owner", Type: model.TypeRelation, Columns: []model.Column{{Name: "ownerId"}}},
		},
	}
	chartFields = []records.FieldMetadata{
		{ID: "f-stage", Name: "stage"},
		{ID: "f-tags", Name: "tags"},
		{ID: "f-closed", Name: "closedAt"},
		{ID: "f-amount", Name: "amount"},
		{ID: "f-region", Name: "region"},
		{ID: "f-owner", Name: "owner", Relation: &records.RelationMetadata{Target: ownerObject, JoinColumn: "ownerId"}},
	}
)

func seedChart(t *testing.T) *store.GroupByEngine {
	t.Helper()
	pool := newPool(t)
	schema := workspace.SchemaName()
	exec(t, pool, `CREATE TABLE `+schema+`."chartOwner" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "deletedAt" timestamptz, "name" text, "addressCountry" text)`)
	exec(t, pool, `CREATE TABLE `+schema+`."chartItem" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "deletedAt" timestamptz, "stage" text, "tags" text[], "closedAt" timestamptz, "amount" numeric, "regionCountry" text, "ownerId" uuid)`)
	exec(t, pool, `INSERT INTO `+schema+`."chartOwner" ("id", "name", "addressCountry") VALUES
		('00000000-0000-0000-0000-000000000001', 'Ada', 'UK'),
		('00000000-0000-0000-0000-000000000002', 'Bo', 'FR')`)
	exec(t, pool, `INSERT INTO `+schema+`."chartItem" ("stage", "tags", "closedAt", "amount", "regionCountry", "ownerId") VALUES
		('WON',  '{hot,warm}', '2024-01-07 23:30:00+00', 10, 'UK', '00000000-0000-0000-0000-000000000001'),
		('WON',  '{cold}',     '2024-01-08 00:30:00+00', 20, 'FR', '00000000-0000-0000-0000-000000000002'),
		('NEW',  '{}',         '2024-02-14 12:00:00+00', 5,  'UK', '00000000-0000-0000-0000-000000000001'),
		('LOST', NULL,         NULL,                     1,  NULL, NULL)`)
	exec(t, pool, `INSERT INTO `+schema+`."chartItem" ("stage", "amount", "deletedAt") VALUES ('WON', 1000, now())`)
	return store.NewGroupByEngine(pool, chartObject, chartFields)
}

func exec(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	if _, err := pool.Exec(t.Context(), sql); err != nil {
		t.Fatalf("exec: %v", err)
	}
}

func rowsOf(keys ...[]any) []records.GroupRow {
	rows := make([]records.GroupRow, len(keys))
	for i, key := range keys {
		rows[i] = records.GroupRow{Keys: key[:len(key)-1], Value: key[len(key)-1]}
	}
	return rows
}

func TestGroupByEngine_GroupBy(t *testing.T) {
	t.Parallel()
	engine := seedChart(t)
	count := records.GroupAggregate{Operation: "count"}
	sumAmount := records.GroupAggregate{FieldID: "f-amount", Operation: "sum"}

	tests := []struct {
		name  string
		query records.GroupByQuery
		want  []records.GroupRow
	}{
		{
			"select orders by option position",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-stage"}}, Aggregate: count},
			rowsOf([]any{"NEW", int64(1)}, []any{"WON", int64(2)}, []any{"LOST", int64(1)}),
		},
		{
			"multi select unnests each value, empty and null collapse to the empty group",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-tags"}}, Aggregate: count},
			rowsOf([]any{"hot", int64(1)}, []any{"cold", int64(1)}, []any{"warm", int64(1)}, []any{nil, int64(2)}),
		},
		{
			"day granularity in UTC",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityDay}}, Aggregate: count},
			rowsOf([]any{"2024-01-07", int64(1)}, []any{"2024-01-08", int64(1)}, []any{"2024-02-14", int64(1)}, []any{nil, int64(1)}),
		},
		{
			"timezone moves a record across the day boundary",
			records.GroupByQuery{TimeZone: "Asia/Tokyo", Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityDay}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"2024-01-08", int64(2)}, []any{"2024-02-14", int64(1)}),
		},
		{
			"week starting Monday",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityWeek}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"2024-01-01", int64(1)}, []any{"2024-01-08", int64(1)}),
		},
		{
			"week starting Sunday",
			records.GroupByQuery{FirstDayOfTheWeek: "SUNDAY", Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityWeek}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"2024-01-07", int64(2)}, []any{"2024-02-11", int64(1)}),
		},
		{
			"month of the year",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityMonthOfYear}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"1", int64(2)}, []any{"2", int64(1)}),
		},
		{
			"day of the week rotates with the week start",
			records.GroupByQuery{FirstDayOfTheWeek: "SUNDAY", Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityDayOfTheWeek}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"7", int64(1)}, []any{"1", int64(1)}),
		},
		{
			"quarter",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityQuarter}}, Aggregate: count},
			rowsOf([]any{"2024-01-01", int64(3)}, []any{nil, int64(1)}),
		},
		{
			"year",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityYear}}, Aggregate: count},
			rowsOf([]any{"2024-01-01", int64(3)}, []any{nil, int64(1)}),
		},
		{
			"quarter of the year",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: records.GranularityQuarterOfYear}}, Aggregate: count},
			rowsOf([]any{"1", int64(3)}, []any{nil, int64(1)}),
		},
		{
			"composite sub-field",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-region", SubField: "addressCountry"}}, Aggregate: sumAmount},
			rowsOf([]any{"FR", 20.0}, []any{"UK", 15.0}, []any{nil, 1.0}),
		},
		{
			"relation groups by the related id",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-owner"}}, Aggregate: count, Limit: 1},
			rowsOf([]any{"00000000-0000-0000-0000-000000000001", int64(2)}),
		},
		{
			"nested relation field",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-owner", NestedField: "name"}}, Aggregate: sumAmount},
			rowsOf([]any{"Ada", 15.0}, []any{"Bo", 20.0}, []any{nil, 1.0}),
		},
		{
			"nested relation composite sub-field",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-owner", NestedField: "address", NestedSubField: "addressCountry"}}, Aggregate: count, Limit: 2},
			rowsOf([]any{"FR", int64(1)}, []any{"UK", int64(2)}),
		},
		{
			"order by aggregate descending",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-stage"}}, Aggregate: sumAmount, OrderBy: []records.GroupOrder{{ByAggregate: true, Descending: true}}},
			rowsOf([]any{"WON", 30.0}, []any{"NEW", 5.0}, []any{"LOST", 1.0}),
		},
		{
			"two dimensions",
			records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-stage"}, {FieldID: "f-region", SubField: "addressCountry"}}, Aggregate: count, Limit: 3},
			rowsOf([]any{"NEW", "UK", int64(1)}, []any{"WON", "FR", int64(1)}, []any{"WON", "UK", int64(1)}),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := engine.GroupBy(t.Context(), tt.query)
			if err != nil {
				t.Fatalf("GroupBy: %v", err)
			}
			if diff := cmp.Diff(tt.want, got); diff != "" {
				t.Errorf("GroupBy mismatch (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("unknown granularity", func(t *testing.T) {
		t.Parallel()
		_, err := engine.GroupBy(t.Context(), records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "f-closed", DateGranularity: "FORTNIGHT"}}, Aggregate: count})
		if err == nil {
			t.Error("GroupBy err = nil, want error")
		}
	})

	t.Run("unknown field id", func(t *testing.T) {
		t.Parallel()
		_, err := engine.GroupBy(t.Context(), records.GroupByQuery{Dimensions: []records.GroupDimension{{FieldID: "nope"}}, Aggregate: count})
		if !errors.Is(err, records.ErrUnknownField) {
			t.Errorf("GroupBy err = %v, want ErrUnknownField", err)
		}
	})
}
