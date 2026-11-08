package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"unicode"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const defaultFindLimit = 20

var errMissingID = errors.New("id is required")

type recordStore[TRecord, TInput any] interface {
	Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[TRecord], error)
	Create(ctx context.Context, actor records.Actor, input TInput) (TRecord, error)
	Update(ctx context.Context, actor records.Actor, id string, input TInput) (TRecord, error)
	SoftDelete(ctx context.Context, id string) error
}

// NewRecordTools returns the standard-object record tools over the records interfaces.
func NewRecordTools(
	companies records.Companies,
	people records.People,
	opportunities records.Opportunities,
	notes records.Notes,
	tasks records.Tasks,
) []Tool {
	var tools []Tool
	tools = append(tools, objectTools("company", companies)...)
	tools = append(tools, objectTools("person", people)...)
	tools = append(tools, objectTools("opportunity", opportunities)...)
	tools = append(tools, objectTools("note", notes)...)
	tools = append(tools, objectTools("task", tasks)...)
	return tools
}

func objectTools[TRecord, TInput any](object string, store recordStore[TRecord, TInput]) []Tool {
	if store == nil {
		return nil
	}
	return []Tool{
		funcTool{
			spec: ToolSpec{
				Name:        "find_" + object,
				Description: "List " + object + " records, optionally filtered by one field.",
				InputSchema: json.RawMessage(`{"type":"object","properties":{"limit":{"type":"integer"},"field":{"type":"string"},"operand":{"type":"string"},"value":{}}}`),
			},
			call: func(ctx context.Context, _ auth.Principal, input json.RawMessage) (any, error) {
				var args struct {
					Limit   int
					Field   string
					Operand records.Operand
					Value   any
				}
				if err := decode(input, &args); err != nil {
					return nil, err
				}
				if args.Limit <= 0 {
					args.Limit = defaultFindLimit
				}
				var filter records.Filter
				if args.Field != "" {
					if args.Operand == "" {
						args.Operand = "eq"
					}
					filter.Field = &records.FieldFilter{Field: args.Field, Operand: args.Operand, Value: args.Value}
				}
				page, err := store.Find(ctx, filter, nil, records.PageRequest{First: args.Limit})
				if err != nil {
					return nil, fmt.Errorf("find %s: %w", object, err)
				}
				return page.Records, nil
			},
		},
		funcTool{
			spec: ToolSpec{
				Name:        "create_" + object,
				Description: "Create a " + object + " record.",
				InputSchema: inputSchema[TInput](false),
			},
			call: func(ctx context.Context, principal auth.Principal, input json.RawMessage) (any, error) {
				var fieldsInput TInput
				if err := decode(input, &fieldsInput); err != nil {
					return nil, err
				}
				record, err := store.Create(ctx, actorFor(principal), fieldsInput)
				if err != nil {
					return nil, fmt.Errorf("create %s: %w", object, err)
				}
				return record, nil
			},
		},
		funcTool{
			spec: ToolSpec{
				Name:        "update_" + object,
				Description: "Update a " + object + " record by id; omitted fields stay unchanged.",
				InputSchema: inputSchema[TInput](true),
			},
			call: func(ctx context.Context, principal auth.Principal, input json.RawMessage) (any, error) {
				var args struct{ ID string }
				var fieldsInput TInput
				if err := decode(input, &args); err != nil {
					return nil, err
				}
				if args.ID == "" {
					return nil, errMissingID
				}
				if err := decode(input, &fieldsInput); err != nil {
					return nil, err
				}
				record, err := store.Update(ctx, actorFor(principal), args.ID, fieldsInput)
				if err != nil {
					return nil, fmt.Errorf("update %s: %w", object, err)
				}
				return record, nil
			},
		},
		funcTool{
			spec: ToolSpec{
				Name:        "delete_" + object,
				Description: "Soft-delete a " + object + " record by id.",
				InputSchema: json.RawMessage(`{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}`),
			},
			call: func(ctx context.Context, _ auth.Principal, input json.RawMessage) (any, error) {
				var args struct{ ID string }
				if err := decode(input, &args); err != nil {
					return nil, err
				}
				if args.ID == "" {
					return nil, errMissingID
				}
				if err := store.SoftDelete(ctx, args.ID); err != nil {
					return nil, fmt.Errorf("delete %s: %w", object, err)
				}
				return map[string]bool{"deleted": true}, nil
			},
		},
	}
}

type funcTool struct {
	spec ToolSpec
	call func(ctx context.Context, principal auth.Principal, input json.RawMessage) (any, error)
}

func (t funcTool) Spec() ToolSpec { return t.spec }

func (t funcTool) Call(ctx context.Context, principal auth.Principal, input json.RawMessage) (json.RawMessage, error) {
	result, err := t.call(ctx, principal, input)
	if err != nil {
		return nil, err
	}
	out, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("encode %s result: %w", t.spec.Name, err)
	}
	return out, nil
}

func decode(input json.RawMessage, into any) error {
	if len(input) == 0 {
		return nil
	}
	if err := json.Unmarshal(input, into); err != nil {
		return fmt.Errorf("decode tool input: %w", err)
	}
	return nil
}

func actorFor(principal auth.Principal) records.Actor {
	return records.Actor{Source: "API", WorkspaceMemberID: principal.WorkspaceMemberID, Name: "AI"}
}

func inputSchema[TInput any](requireID bool) json.RawMessage {
	properties := map[string]map[string]string{}
	inputType := reflect.TypeFor[TInput]()
	for field := range inputType.Fields() {
		kind := "object"
		if field.Type.Kind() == reflect.Pointer && field.Type.Elem().Kind() == reflect.String {
			kind = "string"
		}
		properties[lowerFirst(field.Name)] = map[string]string{"type": kind}
	}
	schema := map[string]any{"type": "object", "properties": properties}
	if requireID {
		properties["id"] = map[string]string{"type": "string"}
		schema["required"] = []string{"id"}
	}
	out, err := json.Marshal(schema)
	if err != nil {
		panic(err)
	}
	return out
}

func lowerFirst(name string) string {
	runes := []rune(name)
	runes[0] = unicode.ToLower(runes[0])
	return string(runes)
}
