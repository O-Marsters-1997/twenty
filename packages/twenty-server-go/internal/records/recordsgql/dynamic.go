package recordsgql

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/parser"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const maxDynamicBody = 1 << 20

type DynamicStore interface {
	Find(ctx context.Context, filter records.Filter, orderBy []records.OrderBy, page records.PageRequest) (records.Page[map[string]any], error)
	Get(ctx context.Context, id string) (map[string]any, error)
	Create(ctx context.Context, actor records.Actor, values map[string]any) (map[string]any, error)
	Update(ctx context.Context, actor records.Actor, id string, values map[string]any) (map[string]any, error)
	SoftDelete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
	Destroy(ctx context.Context, id string) error
	Aggregate(ctx context.Context, filter records.Filter, aggregates []records.Aggregate) (records.AggregateResult, error)
	GroupBy(ctx context.Context, filter records.Filter, groupBy []records.GroupBy, orderBy []records.OrderBy, aggregates []records.Aggregate, perGroup records.PageRequest) ([]records.Group[map[string]any], error)
	Merge(ctx context.Context, actor records.Actor, ids []string, priorityIndex int, dryRun bool) (map[string]any, error)
}

type DynamicObject struct {
	Object            model.Object
	Store             DynamicStore
	DuplicateCriteria [][]string
}

type Dynamic struct {
	objects  map[string]DynamicObject
	newStore func(model.Object) DynamicStore
	logger   *slog.Logger
}

func NewDynamic(objects []DynamicObject, newStore func(model.Object) DynamicStore, logger *slog.Logger) *Dynamic {
	d := &Dynamic{objects: map[string]DynamicObject{}, newStore: newStore, logger: logger}
	for _, object := range objects {
		d.objects[object.Object.NameSingular] = object
	}
	return d
}

type dynamicRequest struct {
	Query         string         `json:"query"`
	OperationName string         `json:"operationName"`
	Variables     map[string]any `json:"variables"`
}

type dynamicRun struct {
	dynamic   *Dynamic
	document  *ast.QueryDocument
	variables map[string]any
}

var errBadRequest = errors.New("bad request")

func (d *Dynamic) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, maxDynamicBody))
	if err != nil {
		http.Error(w, "read request body", http.StatusBadRequest)
		return
	}
	var request dynamicRequest
	if err := json.Unmarshal(bytes.TrimSpace(body), &request); err != nil {
		d.write(w, nil, fmt.Errorf("%w: request must be a single JSON graphql operation", errBadRequest))
		return
	}
	data, err := d.execute(r.Context(), request)
	d.write(w, data, err)
}

func errorCode(err error) string {
	switch {
	case errors.Is(err, records.ErrUnknownField), errors.Is(err, errBadRequest):
		return "BAD_USER_INPUT"
	case errors.Is(err, records.ErrNotFound):
		return "NOT_FOUND"
	case errors.Is(err, auth.ErrUnauthenticated):
		return "UNAUTHENTICATED"
	}
	return "INTERNAL_SERVER_ERROR"
}

func (d *Dynamic) write(w http.ResponseWriter, data map[string]any, err error) {
	response := map[string]any{"data": data}
	if err != nil {
		code := errorCode(err)
		if code == "INTERNAL_SERVER_ERROR" {
			d.logger.Error("resolve dynamic graphql", "err", err)
		}
		response = map[string]any{"data": nil, "errors": []map[string]any{{"message": err.Error(), "extensions": map[string]string{"code": code}}}}
	}
	w.Header().Set("Content-Type", "application/json")
	if encodeErr := json.NewEncoder(w).Encode(response); encodeErr != nil {
		d.logger.Warn("write dynamic graphql response", "err", encodeErr)
	}
}

func (d *Dynamic) execute(ctx context.Context, request dynamicRequest) (map[string]any, error) {
	document, parseErr := parser.ParseQuery(&ast.Source{Input: request.Query})
	if parseErr != nil {
		return nil, fmt.Errorf("%w: %w", errBadRequest, parseErr)
	}
	var operation *ast.OperationDefinition
	for _, candidate := range document.Operations {
		if request.OperationName == "" || candidate.Name == request.OperationName {
			operation = candidate
			break
		}
	}
	if operation == nil {
		return nil, fmt.Errorf("%w: operation %q not found", errBadRequest, request.OperationName)
	}
	variables := map[string]any{}
	for _, definition := range operation.VariableDefinitions {
		if definition.DefaultValue != nil {
			value, err := definition.DefaultValue.Value(nil)
			if err != nil {
				return nil, fmt.Errorf("%w: default of $%s: %w", errBadRequest, definition.Variable, err)
			}
			variables[definition.Variable] = value
		}
	}
	for name, value := range request.Variables {
		variables[name] = value
	}
	run := &dynamicRun{dynamic: d, document: document, variables: variables}
	data := map[string]any{}
	for _, field := range run.fields(operation.SelectionSet) {
		if field.Name == "__typename" {
			data[field.Alias] = capitalized(string(operation.Operation))
			continue
		}
		value, err := run.root(ctx, operation.Operation, field)
		if err != nil {
			return nil, err
		}
		data[field.Alias] = value
	}
	return data, nil
}

func (r *dynamicRun) fields(set ast.SelectionSet) []*ast.Field {
	var fields []*ast.Field
	for _, selection := range set {
		switch typed := selection.(type) {
		case *ast.Field:
			fields = append(fields, typed)
		case *ast.InlineFragment:
			fields = append(fields, r.fields(typed.SelectionSet)...)
		case *ast.FragmentSpread:
			if fragment := r.document.Fragments.ForName(typed.Name); fragment != nil {
				fields = append(fields, r.fields(fragment.SelectionSet)...)
			}
		}
	}
	return fields
}

func (r *dynamicRun) args(field *ast.Field) (map[string]any, error) {
	args := map[string]any{}
	for _, argument := range field.Arguments {
		value, err := argument.Value.Value(r.variables)
		if err != nil {
			return nil, fmt.Errorf("%w: argument %s: %w", errBadRequest, argument.Name, err)
		}
		args[argument.Name] = value
	}
	return args, nil
}

func (r *dynamicRun) actor(ctx context.Context) (records.Actor, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return records.Actor{}, auth.ErrUnauthenticated
	}
	return records.Actor{Source: "MANUAL", WorkspaceMemberID: principal.WorkspaceMemberID}, nil
}

func (r *dynamicRun) storeFor(object model.Object) DynamicStore {
	if registered, ok := r.dynamic.objects[object.NameSingular]; ok {
		return registered.Store
	}
	return r.dynamic.newStore(object)
}
