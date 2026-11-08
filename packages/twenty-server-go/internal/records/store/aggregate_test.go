package store_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func insertCompany(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	var id string
	if err := pool.QueryRow(t.Context(), `INSERT INTO `+workspace.SchemaName()+`.company DEFAULT VALUES RETURNING id::text`).Scan(&id); err != nil {
		t.Fatalf("insert company: %v", err)
	}
	return id
}

func createAt(t *testing.T, people *store.People, name string, companyID *string, jobTitle *string) records.Person {
	t.Helper()
	person, err := people.Create(t.Context(), actor, records.PersonInput{
		Name:      &records.FullName{FirstName: name},
		JobTitle:  jobTitle,
		CompanyID: companyID,
	})
	if err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
	return person
}

func TestPeople_Aggregate(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	people := store.NewPeople(pool)
	engineer, designer := "Engineer", "Designer"
	createAt(t, people, "Ada", nil, &engineer)
	createAt(t, people, "Bea", nil, &engineer)
	createAt(t, people, "Cy", nil, &designer)
	createAt(t, people, "Di", nil, nil)
	first := create(t, people, "Eve", "", "eve@example.com")

	tests := []struct {
		name      string
		aggregate records.Aggregate
		key       string
		want      any
	}{
		{"count", records.Aggregate{Field: "id", Operation: "count"}, "totalCount", int64(5)},
		{"countEmpty", records.Aggregate{Field: "jobTitle", Operation: "countEmpty"}, "countEmptyJobTitle", int64(2)},
		{"countNotEmpty", records.Aggregate{Field: "jobTitle", Operation: "countNotEmpty"}, "countNotEmptyJobTitle", int64(3)},
		{"countUniqueValues", records.Aggregate{Field: "jobTitle", Operation: "countUniqueValues"}, "countUniqueValuesJobTitle", int64(2)},
		{"percentageEmpty", records.Aggregate{Field: "jobTitle", Operation: "percentageEmpty"}, "percentageEmptyJobTitle", 0.4},
		{"percentageNotEmpty", records.Aggregate{Field: "jobTitle", Operation: "percentageNotEmpty"}, "percentageNotEmptyJobTitle", 0.6},
		{"countNotEmpty on composite", records.Aggregate{Field: "emails", Operation: "countNotEmpty"}, "countNotEmptyEmails", int64(1)},
		{"sum", records.Aggregate{Field: "position", Operation: "sum"}, "sumPosition", -10.0},
		{"avg", records.Aggregate{Field: "position", Operation: "avg"}, "avgPosition", -2.0},
		{"min", records.Aggregate{Field: "position", Operation: "min"}, "minPosition", -4.0},
		{"max", records.Aggregate{Field: "position", Operation: "max"}, "maxPosition", 0.0},
	}
	t.Run("min of a date is the earliest creation time", func(t *testing.T) {
		got, err := people.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "createdAt", Operation: "min"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if _, ok := got["minCreatedAt"].(time.Time); !ok {
			t.Errorf("Aggregate(min createdAt)[minCreatedAt] = %v, want a time.Time", got["minCreatedAt"])
		}
	})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := people.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{tt.aggregate})
			if err != nil {
				t.Fatalf("Aggregate: %v", err)
			}
			if diff := cmp.Diff(records.AggregateResult{tt.key: tt.want}, got); diff != "" {
				t.Errorf("Aggregate mismatch (-want +got):\n%s", diff)
			}
		})
	}

	t.Run("respects the filter and soft deletes", func(t *testing.T) {
		if err := people.SoftDelete(t.Context(), first.ID); err != nil {
			t.Fatal(err)
		}
		got, err := people.Aggregate(t.Context(), fieldFilter("jobTitle", "", "eq", "Engineer"), []records.Aggregate{{Field: "id", Operation: "count"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if diff := cmp.Diff(records.AggregateResult{"totalCount": int64(2)}, got); diff != "" {
			t.Errorf("Aggregate mismatch (-want +got):\n%s", diff)
		}
		all, err := people.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "id", Operation: "count"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if all["totalCount"] != int64(4) {
			t.Errorf("totalCount = %v, want 4 without the deleted person", all["totalCount"])
		}
	})

	t.Run("empty set yields null for conditional counts", func(t *testing.T) {
		got, err := people.Aggregate(t.Context(), fieldFilter("jobTitle", "", "eq", "Nobody"), []records.Aggregate{{Field: "jobTitle", Operation: "countEmpty"}})
		if err != nil {
			t.Fatalf("Aggregate: %v", err)
		}
		if got["countEmptyJobTitle"] != nil {
			t.Errorf("countEmptyJobTitle = %v, want nil", got["countEmptyJobTitle"])
		}
	})
}

func TestPeople_AggregateRejects(t *testing.T) {
	t.Parallel()
	people := newPeople(t)
	for _, aggregate := range []records.Aggregate{
		{Field: "nope", Operation: "count"},
		{Field: "searchVector", Operation: "countEmpty"},
		{Field: "jobTitle", Operation: "sum"},
		{Field: "jobTitle", Operation: "countTrue"},
	} {
		t.Run(aggregate.Field+" "+string(aggregate.Operation), func(t *testing.T) {
			_, err := people.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{aggregate})
			if !errors.Is(err, records.ErrUnknownField) {
				t.Errorf("Aggregate(%+v) error = %v, want ErrUnknownField", aggregate, err)
			}
		})
	}
	t.Run("unknown operation", func(t *testing.T) {
		if _, err := people.Aggregate(t.Context(), records.Filter{}, []records.Aggregate{{Field: "id", Operation: "median"}}); err == nil {
			t.Error("Aggregate(id median) succeeded, want an error")
		}
	})
}

func TestPeople_GroupBy(t *testing.T) {
	t.Parallel()
	pool := newPool(t)
	people := store.NewPeople(pool)
	acme, globex := insertCompany(t, pool), insertCompany(t, pool)
	createAt(t, people, "Ada", &acme, nil)
	createAt(t, people, "Bea", &acme, nil)
	createAt(t, people, "Cy", &globex, nil)
	createAt(t, people, "Di", nil, nil)

	aggregates := []records.Aggregate{{Field: "id", Operation: "count"}}
	t.Run("groups by relation with counts, nulls last", func(t *testing.T) {
		groups, err := people.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "company"}}, nil, aggregates, records.PageRequest{})
		if err != nil {
			t.Fatalf("GroupBy: %v", err)
		}
		counts := map[any]any{}
		for _, group := range groups {
			counts[group.Key[0]] = group.Aggregates["totalCount"]
		}
		want := map[any]any{acme: int64(2), globex: int64(1), nil: int64(1)}
		if diff := cmp.Diff(want, counts); diff != "" {
			t.Errorf("group counts mismatch (-want +got):\n%s", diff)
		}
		if len(groups) != 3 {
			t.Fatalf("GroupBy returned %d groups, want 3", len(groups))
		}
		if last := groups[len(groups)-1].Key[0]; last != nil {
			t.Errorf("last group key = %v, want nil (nulls last)", last)
		}
	})

	t.Run("pages records per group", func(t *testing.T) {
		groups, err := people.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "company"}},
			[]records.OrderBy{{Field: "company", Direction: "DescNullsLast"}}, nil, records.PageRequest{First: 1})
		if err != nil {
			t.Fatalf("GroupBy: %v", err)
		}
		total := 0
		for _, group := range groups {
			total += group.Records.TotalCount
			if len(group.Records.Records) != 1 {
				t.Errorf("group %v has %d records, want 1", group.Key, len(group.Records.Records))
			}
		}
		if total != 4 {
			t.Errorf("sum of per-group TotalCount = %d, want 4", total)
		}
		var acmeGroup records.Group[records.Person]
		for _, group := range groups {
			if group.Key[0] == acme {
				acmeGroup = group
			}
		}
		if !acmeGroup.Records.HasNext {
			t.Error("acme group HasNext = false, want true with 2 people and First: 1")
		}
	})

	t.Run("applies the filter before grouping", func(t *testing.T) {
		groups, err := people.GroupBy(t.Context(), fieldFilter("name", "firstName", "eq", "Cy"), []records.GroupBy{{Field: "company"}}, nil, aggregates, records.PageRequest{})
		if err != nil {
			t.Fatalf("GroupBy: %v", err)
		}
		if len(groups) != 1 || groups[0].Key[0] != globex {
			t.Errorf("groups = %+v, want only globex", groups)
		}
	})

	t.Run("rejects unknown and ungrouped fields", func(t *testing.T) {
		for name, call := range map[string]func() error{
			"unknown group field": func() error {
				_, err := people.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "nope"}}, nil, nil, records.PageRequest{})
				return err
			},
			"order by an ungrouped field": func() error {
				_, err := people.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "company"}}, []records.OrderBy{{Field: "jobTitle", Direction: "AscNullsLast"}}, nil, records.PageRequest{})
				return err
			},
			"unknown aggregate field": func() error {
				_, err := people.GroupBy(t.Context(), records.Filter{}, []records.GroupBy{{Field: "company"}}, nil, []records.Aggregate{{Field: "nope", Operation: "count"}}, records.PageRequest{})
				return err
			},
			"no group fields": func() error {
				_, err := people.GroupBy(t.Context(), records.Filter{}, nil, nil, nil, records.PageRequest{})
				return err
			},
		} {
			t.Run(name, func(t *testing.T) {
				if err := call(); !errors.Is(err, records.ErrUnknownField) {
					t.Errorf("GroupBy error = %v, want ErrUnknownField", err)
				}
			})
		}
	})
}
