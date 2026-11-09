package ai_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

type fakeCompanies struct {
	records.Companies
	found   records.Filter
	limit   int
	created records.CompanyInput
	actor   records.Actor
	updated string
	deleted string
	err     error
}

func (f *fakeCompanies) Find(_ context.Context, filter records.Filter, _ []records.OrderBy, page records.PageRequest) (records.Page[records.Company], error) {
	f.found, f.limit = filter, page.First
	return records.Page[records.Company]{Records: []records.Company{{ID: "c1", Name: "Acme"}}}, f.err
}

func (f *fakeCompanies) Create(_ context.Context, actor records.Actor, input records.CompanyInput) (records.Company, error) {
	f.actor, f.created = actor, input
	return records.Company{ID: "c2", Name: *input.Name}, f.err
}

func (f *fakeCompanies) Update(_ context.Context, _ records.Actor, id string, input records.CompanyInput) (records.Company, error) {
	f.updated = id
	return records.Company{ID: id, Name: *input.Name}, f.err
}

func (f *fakeCompanies) SoftDelete(_ context.Context, id string) error {
	f.deleted = id
	return f.err
}

func newRegistry(store *fakeCompanies) ai.Registry {
	return ai.NewRegistry(ai.NewRecordTools(store, nil, nil, nil, nil)...)
}

func call(t *testing.T, registry ai.Registry, name, input string) (json.RawMessage, error) {
	t.Helper()
	tool, ok := registry.Lookup(name)
	if !ok {
		t.Fatalf("tool %q not registered", name)
	}
	return tool.Call(context.Background(), auth.Principal{WorkspaceMemberID: "wm1"}, json.RawMessage(input))
}

func TestRegistry(t *testing.T) {
	registry := newRegistry(&fakeCompanies{})

	t.Run("lists tools with valid schemas", func(t *testing.T) {
		names := map[string]bool{}
		for _, tool := range registry.Tools(context.Background(), auth.Principal{}) {
			spec := tool.Spec()
			names[spec.Name] = true
			if !json.Valid(spec.InputSchema) {
				t.Errorf("%s: invalid input schema %s", spec.Name, spec.InputSchema)
			}
		}
		for _, want := range []string{"find_company", "create_company", "update_company", "delete_company"} {
			if !names[want] {
				t.Errorf("missing tool %s", want)
			}
		}
		if names["find_task"] {
			t.Error("tool registered for a nil store")
		}
	})

	t.Run("lookup misses unknown names", func(t *testing.T) {
		if _, ok := registry.Lookup("nope"); ok {
			t.Error("Lookup(nope) found a tool")
		}
	})
}

func TestRecordTools(t *testing.T) {
	t.Run("create decodes input and stamps the actor", func(t *testing.T) {
		store := &fakeCompanies{}
		out, err := call(t, newRegistry(store), "create_company", `{"name":"Acme"}`)
		if err != nil {
			t.Fatal(err)
		}
		if store.created.Name == nil || *store.created.Name != "Acme" || store.actor.WorkspaceMemberID != "wm1" {
			t.Errorf("created %+v by %+v", store.created, store.actor)
		}
		var got struct{ ID string }
		if err := json.Unmarshal(out, &got); err != nil || got.ID != "c2" {
			t.Errorf("result %s, err %v", out, err)
		}
	})

	t.Run("find applies the filter and default limit", func(t *testing.T) {
		store := &fakeCompanies{}
		if _, err := call(t, newRegistry(store), "find_company", `{"field":"name","value":"Acme"}`); err != nil {
			t.Fatal(err)
		}
		if store.found.Field == nil || store.found.Field.Field != "name" || store.found.Field.Operand != "eq" || store.limit != 20 {
			t.Errorf("filter %+v limit %d", store.found.Field, store.limit)
		}
	})

	t.Run("update and delete require an id", func(t *testing.T) {
		store := &fakeCompanies{}
		registry := newRegistry(store)
		for _, name := range []string{"update_company", "delete_company"} {
			if _, err := call(t, registry, name, `{"name":"x"}`); err == nil {
				t.Errorf("%s without id succeeded", name)
			}
		}
		if _, err := call(t, registry, "update_company", `{"id":"c1","name":"x"}`); err != nil || store.updated != "c1" {
			t.Errorf("update: %v, id %q", err, store.updated)
		}
		if _, err := call(t, registry, "delete_company", `{"id":"c1"}`); err != nil || store.deleted != "c1" {
			t.Errorf("delete: %v, id %q", err, store.deleted)
		}
	})

	t.Run("store errors are wrapped", func(t *testing.T) {
		boom := errors.New("boom")
		if _, err := call(t, newRegistry(&fakeCompanies{err: boom}), "find_company", `{}`); !errors.Is(err, boom) {
			t.Errorf("find_company err = %v, want wrapping boom", err)
		}
	})
}
