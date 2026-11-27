package recordsgql

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const isoMillis = "2006-01-02T15:04:05.000Z"

var relationTargetAliases = map[string]string{
	"assignee": "workspaceMember", "accountOwner": "workspaceMember", "owner": "workspaceMember",
	"senderWorkspaceMember": "workspaceMember", "pointOfContact": "person",
	"thread": "agentChatThread", "turn": "agentTurn", "list": "messageList",
}

var compositeTypenames = map[model.FieldType]string{
	model.TypeFullName: "FullName", model.TypeEmails: "Emails", model.TypePhones: "Phones", model.TypeLinks: "Links",
	model.TypeCurrency: "Currency", model.TypeAddress: "Address", model.TypeActor: "Actor", model.TypeRichText: "RichText",
}

func capitalized(name string) string { return strings.ToUpper(name[:1]) + name[1:] }

func lowered(name string) string { return strings.ToLower(name[:1]) + name[1:] }

func fieldNamed(object model.Object, name string) *model.Field {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == name })
	if index < 0 {
		return nil
	}
	return &object.Fields[index]
}

func objectSingular(singular string) (model.Object, bool) {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == singular })
	if index < 0 {
		return model.Object{}, false
	}
	return model.Objects[index], true
}

func relationTarget(fieldName string) (model.Object, bool) {
	if alias, ok := relationTargetAliases[fieldName]; ok {
		fieldName = alias
	}
	if rest, ok := strings.CutPrefix(fieldName, "target"); ok && rest != "" {
		fieldName = lowered(rest)
	}
	return objectSingular(fieldName)
}

func isScalarField(field *model.Field) bool {
	return len(field.Columns) == 1 && field.Columns[0].SubField == ""
}

func columnOf(field *model.Field, subField string) (string, bool) {
	for _, column := range field.Columns {
		if column.SubField == subField {
			return column.Name, true
		}
	}
	return "", false
}

func inputColumns(object model.Object, data map[string]any) (map[string]any, error) {
	values := map[string]any{}
	for key, raw := range data {
		field := fieldNamed(object, key)
		switch {
		case field == nil:
			byColumn := slices.IndexFunc(object.Fields, func(other model.Field) bool {
				return other.Type == model.TypeRelation && isScalarField(&other) && other.Columns[0].Name == key
			})
			if byColumn < 0 {
				return nil, fmt.Errorf("%w: %s on %s", records.ErrUnknownField, key, object.NameSingular)
			}
			values[key] = raw
		case isScalarField(field):
			values[field.Columns[0].Name] = columnValue(*field, raw)
		case len(field.Columns) > 0:
			nested, ok := raw.(map[string]any)
			if !ok {
				if raw == nil {
					continue
				}
				return nil, fmt.Errorf("%w: %s must be an object", records.ErrUnknownField, key)
			}
			for subField, value := range nested {
				column, ok := columnOf(field, subField)
				if !ok {
					return nil, fmt.Errorf("%w: %s.%s on %s", records.ErrUnknownField, key, subField, object.NameSingular)
				}
				values[column] = value
			}
		default:
			return nil, fmt.Errorf("%w: %s on %s", records.ErrUnknownField, key, object.NameSingular)
		}
	}
	return values, nil
}

func columnValue(field model.Field, raw any) any {
	switch typed := raw.(type) {
	case []any:
		if field.Type != model.TypeMultiSelect {
			return typed
		}
		texts := make([]string, len(typed))
		for i, item := range typed {
			texts[i] = fmt.Sprint(item)
		}
		return texts
	case float64:
		if field.Type == model.TypeNumber && typed == float64(int64(typed)) {
			return int64(typed)
		}
	}
	return raw
}

func outputValue(field model.Field, raw any) any {
	switch typed := raw.(type) {
	case string:
		if field.Type != model.TypeDateTime {
			return typed
		}
		parsed, err := time.Parse(time.RFC3339Nano, typed)
		if err != nil {
			return typed
		}
		return parsed.UTC().Format(isoMillis)
	case time.Time:
		return typed.UTC().Format(isoMillis)
	}
	return raw
}
