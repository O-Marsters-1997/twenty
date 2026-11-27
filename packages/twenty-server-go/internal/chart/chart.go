package chart

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

const (
	maxGroups    = 100
	notSetLabel  = "Not Set"
	microsPerOne = 1_000_000
)

var (
	ErrNotFound             = errors.New("object metadata not found")
	ErrInvalidConfiguration = errors.New("invalid chart configuration")
)

var aggregateOperations = map[string]records.AggregateOperation{
	"AVG": "avg", "COUNT": "count", "COUNT_EMPTY": "countEmpty", "COUNT_FALSE": "countFalse",
	"COUNT_NOT_EMPTY": "countNotEmpty", "COUNT_TRUE": "countTrue", "COUNT_UNIQUE_VALUES": "countUniqueValues",
	"MAX": "max", "MIN": "min", "PERCENTAGE_EMPTY": "percentageEmpty", "PERCENTAGE_NOT_EMPTY": "percentageNotEmpty", "SUM": "sum",
}

var aggregateLabels = map[records.AggregateOperation]string{
	"avg": "Average", "count": "Count", "countEmpty": "Empty", "countFalse": "False", "countNotEmpty": "Not empty",
	"countTrue": "True", "countUniqueValues": "Unique values", "max": "Max", "min": "Min",
	"percentageEmpty": "Percent empty", "percentageNotEmpty": "Percent not empty", "sum": "Sum",
}

type Grouper interface {
	GroupBy(ctx context.Context, query records.GroupByQuery) ([]records.GroupRow, error)
}

type Service struct {
	Metadata   metadata.Reader
	NewGrouper func(object model.Object, fields []records.FieldMetadata) Grouper
}

type BarChartSeries struct {
	Key   string
	Label string
}

type BarChartData struct {
	Data                 []any
	IndexBy              string
	Keys                 []string
	Series               []*BarChartSeries
	XAxisLabel           string
	YAxisLabel           string
	ShowLegend           bool
	ShowDataLabels       bool
	Layout               string
	GroupMode            string
	HasTooManyGroups     bool
	FormattedToRawLookup map[string]any
}

type barChartConfiguration struct {
	AggregateFieldMetadataID string         `json:"aggregateFieldMetadataId"`
	AggregateOperation       string         `json:"aggregateOperation"`
	Filter                   map[string]any `json:"filter"`
	FirstDayOfTheWeek        *int           `json:"firstDayOfTheWeek"`
	GroupMode                string         `json:"groupMode"`
	IsCumulative             bool           `json:"isCumulative"`
	Layout                   string         `json:"layout"`
	OmitNullValues           bool           `json:"omitNullValues"`
	Timezone                 string         `json:"timezone"`

	PrimaryAxisDateGranularity          string   `json:"primaryAxisDateGranularity"`
	PrimaryAxisGroupByFieldMetadataID   string   `json:"primaryAxisGroupByFieldMetadataId"`
	PrimaryAxisGroupBySubFieldName      string   `json:"primaryAxisGroupBySubFieldName"`
	PrimaryAxisManualSortOrder          []string `json:"primaryAxisManualSortOrder"`
	PrimaryAxisOrderBy                  string   `json:"primaryAxisOrderBy"`
	SecondaryAxisGroupByDateGranularity string   `json:"secondaryAxisGroupByDateGranularity"`
	SecondaryAxisGroupByFieldMetadataID string   `json:"secondaryAxisGroupByFieldMetadataId"`
	SecondaryAxisGroupBySubFieldName    string   `json:"secondaryAxisGroupBySubFieldName"`
	SecondaryAxisManualSortOrder        []string `json:"secondaryAxisManualSortOrder"`
	SecondaryAxisOrderBy                string   `json:"secondaryAxisOrderBy"`
}

type axis struct {
	dimension records.GroupDimension
	kind      model.FieldType
	options   map[string]string
	label     string
	name      string
	order     string
	manual    []string
}

type group struct {
	raw       any
	label     string
	rawString string
}

func (s *Service) BarChartData(ctx context.Context, objectMetadataID string, configuration map[string]any) (BarChartData, error) {
	config, err := decodeConfiguration(configuration)
	if err != nil {
		return BarChartData{}, err
	}
	objects, err := s.Metadata.Objects(ctx)
	if err != nil {
		return BarChartData{}, fmt.Errorf("read object metadata: %w", err)
	}
	index := slices.IndexFunc(objects, func(object metadata.ObjectMetadata) bool { return object.ID == objectMetadataID })
	if index < 0 {
		return BarChartData{}, ErrNotFound
	}
	object := objects[index]
	modelObject, ok := modelObjectNamed(object.NameSingular)
	if !ok {
		return BarChartData{}, fmt.Errorf("%w: no table for %s", ErrNotFound, object.NameSingular)
	}

	fields := make([]records.FieldMetadata, 0, len(object.Fields))
	for _, field := range object.Fields {
		converted := records.FieldMetadata{ID: field.ID, Name: field.Name}
		if field.Relation != nil && field.Relation.Type == "MANY_TO_ONE" {
			target := slices.IndexFunc(objects, func(other metadata.ObjectMetadata) bool { return other.ID == field.Relation.TargetObjectMetadataID })
			targetModel, found := model.Object{}, false
			if target >= 0 {
				targetModel, found = modelObjectNamed(objects[target].NameSingular)
			}
			column := modelColumns(modelObject, field.Name)
			if found && len(column) > 0 {
				converted.Relation = &records.RelationMetadata{Target: targetModel, JoinColumn: column[0].Name}
			}
		}
		fields = append(fields, converted)
	}
	byID := map[string]metadata.FieldMetadata{}
	for _, field := range object.Fields {
		byID[field.ID] = field
	}

	primary, err := newAxis(byID, fields, modelObject, objects, config.PrimaryAxisGroupByFieldMetadataID, config.PrimaryAxisGroupBySubFieldName,
		config.PrimaryAxisDateGranularity, config.PrimaryAxisOrderBy, config.PrimaryAxisManualSortOrder)
	if err != nil {
		return BarChartData{}, err
	}
	var secondary *axis
	if config.SecondaryAxisGroupByFieldMetadataID != "" {
		built, err := newAxis(byID, fields, modelObject, objects, config.SecondaryAxisGroupByFieldMetadataID, config.SecondaryAxisGroupBySubFieldName,
			config.SecondaryAxisGroupByDateGranularity, config.SecondaryAxisOrderBy, config.SecondaryAxisManualSortOrder)
		if err != nil {
			return BarChartData{}, err
		}
		secondary = &built
	}

	aggregateField, ok := byID[config.AggregateFieldMetadataID]
	operation, known := aggregateOperations[config.AggregateOperation]
	if !ok || !known {
		return BarChartData{}, fmt.Errorf("%w: aggregate %s of field %s", ErrInvalidConfiguration, config.AggregateOperation, config.AggregateFieldMetadataID)
	}
	filter, err := recordsFilter(modelObject, config.Filter)
	if err != nil {
		return BarChartData{}, err
	}
	base := records.GroupByQuery{
		Filter:            filter,
		Aggregate:         records.GroupAggregate{FieldID: aggregateField.ID, Operation: operation},
		TimeZone:          config.Timezone,
		FirstDayOfTheWeek: weekdays[min(max(derefInt(config.FirstDayOfTheWeek, 1), 0), 6)],
	}
	aggregateLabel := aggregateLabels[operation]
	if operation != "count" || aggregateField.Name != "id" {
		aggregateLabel += " of " + aggregateField.Label
	}
	scale := 1.0
	if aggregateField.Type == model.TypeCurrency && slices.Contains([]records.AggregateOperation{"min", "max", "avg", "sum"}, operation) {
		scale = microsPerOne
	}

	grouper := s.NewGrouper(modelObject, fields)
	hasTooManyGroups := false
	xs, tooMany, err := orderedGroups(ctx, grouper, base, primary, config.OmitNullValues)
	if err != nil {
		return BarChartData{}, err
	}
	hasTooManyGroups = tooMany

	result := BarChartData{
		IndexBy: primary.name, ShowLegend: true, Layout: orDefault(config.Layout, "VERTICAL"), GroupMode: orDefault(config.GroupMode, "STACKED"),
		FormattedToRawLookup: map[string]any{}, Data: []any{}, Keys: []string{}, Series: []*BarChartSeries{},
	}
	for _, x := range xs {
		result.FormattedToRawLookup[x.label] = x.raw
	}

	cells := map[[2]string]float64{}
	var ys []group
	if secondary == nil {
		query := base
		query.Dimensions = []records.GroupDimension{primary.dimension}
		rows, err := grouper.GroupBy(ctx, query)
		if err != nil {
			return BarChartData{}, fmt.Errorf("group bar chart: %w", err)
		}
		for _, row := range rows {
			x := describe(primary, row.Keys[0])
			cells[[2]string{x.rawString, ""}], err = number(row.Value, scale)
			if err != nil {
				return BarChartData{}, err
			}
		}
		ys = []group{{label: aggregateLabel}}
	} else {
		var tooManySecondary bool
		if ys, tooManySecondary, err = orderedGroups(ctx, grouper, base, *secondary, config.OmitNullValues); err != nil {
			return BarChartData{}, err
		}
		hasTooManyGroups = hasTooManyGroups || tooManySecondary
		query := base
		query.Dimensions = []records.GroupDimension{primary.dimension, secondary.dimension}
		rows, err := grouper.GroupBy(ctx, query)
		if err != nil {
			return BarChartData{}, fmt.Errorf("group bar chart: %w", err)
		}
		for _, row := range rows {
			value, err := number(row.Value, scale)
			if err != nil {
				return BarChartData{}, err
			}
			cells[[2]string{describe(primary, row.Keys[0]).rawString, describe(*secondary, row.Keys[1]).rawString}] = value
		}
		for _, y := range ys {
			result.FormattedToRawLookup[y.label] = y.raw
		}
	}

	for _, y := range ys {
		result.Keys = append(result.Keys, y.label)
		result.Series = append(result.Series, &BarChartSeries{Key: y.label, Label: y.label})
	}
	running := map[string]float64{}
	for _, x := range xs {
		row := map[string]any{primary.name: x.label}
		for _, y := range ys {
			value := cells[[2]string{x.rawString, yID(secondary, y)}]
			if config.IsCumulative {
				running[y.rawString] += value
				value = running[y.rawString]
			}
			row[y.label] = value
		}
		result.Data = append(result.Data, row)
	}
	result.HasTooManyGroups = hasTooManyGroups

	categoryLabel, valueLabel := primary.label, aggregateLabel
	if result.Layout == "HORIZONTAL" {
		result.XAxisLabel, result.YAxisLabel = valueLabel, categoryLabel
	} else {
		result.XAxisLabel, result.YAxisLabel = categoryLabel, valueLabel
	}
	return result, nil
}

var weekdays = []string{"SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"}

func yID(secondary *axis, y group) string {
	if secondary == nil {
		return ""
	}
	return y.rawString
}

func derefInt(value *int, fallback int) int {
	if value == nil {
		return fallback
	}
	return *value
}

func orDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func decodeConfiguration(configuration map[string]any) (barChartConfiguration, error) {
	var config barChartConfiguration
	raw, err := json.Marshal(configuration)
	if err != nil {
		return config, fmt.Errorf("%w: %w", ErrInvalidConfiguration, err)
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err := decoder.Decode(&config); err != nil {
		return config, fmt.Errorf("%w: %w", ErrInvalidConfiguration, err)
	}
	return config, nil
}

func recordsFilter(object model.Object, filter map[string]any) (records.Filter, error) {
	gql := map[string]any{}
	for key, value := range filter {
		if key == "recordFilters" || key == "recordFilterGroups" {
			if items, _ := value.([]any); len(items) > 0 {
				return records.Filter{}, fmt.Errorf("%w: %s filters are not supported", ErrInvalidConfiguration, key)
			}
			continue
		}
		gql[key] = value
	}
	parsed, err := records.ParseFilter(object, gql)
	if err != nil {
		return records.Filter{}, fmt.Errorf("%w: %w", ErrInvalidConfiguration, err)
	}
	return parsed, nil
}

func modelObjectNamed(nameSingular string) (model.Object, bool) {
	index := slices.IndexFunc(model.Objects, func(object model.Object) bool { return object.NameSingular == nameSingular })
	if index < 0 {
		return model.Object{}, false
	}
	return model.Objects[index], true
}

func modelColumns(object model.Object, fieldName string) []model.Column {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == fieldName })
	if index < 0 {
		return nil
	}
	return object.Fields[index].Columns
}

func modelFieldType(object model.Object, fieldName string) model.FieldType {
	index := slices.IndexFunc(object.Fields, func(field model.Field) bool { return field.Name == fieldName })
	if index < 0 {
		return model.TypeText
	}
	return object.Fields[index].Type
}

func optionLabels(raw json.RawMessage) map[string]string {
	var options []struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}
	if len(raw) == 0 || json.Unmarshal(raw, &options) != nil {
		return nil
	}
	labels := make(map[string]string, len(options))
	for _, option := range options {
		labels[option.Value] = option.Label
	}
	return labels
}

func newAxis(byID map[string]metadata.FieldMetadata, fields []records.FieldMetadata, object model.Object, objects []metadata.ObjectMetadata,
	fieldID, subFieldName, granularity, order string, manual []string,
) (axis, error) {
	field, ok := byID[fieldID]
	if !ok {
		return axis{}, fmt.Errorf("%w: unknown group by field %s", ErrInvalidConfiguration, fieldID)
	}
	result := axis{
		dimension: records.GroupDimension{FieldID: field.ID}, kind: modelFieldType(object, field.Name), options: optionLabels(field.Options),
		label: field.Label, name: field.Name, order: orDefault(order, "FIELD_ASC"), manual: manual,
	}
	columns := modelColumns(object, field.Name)
	relation := fields[slices.IndexFunc(fields, func(candidate records.FieldMetadata) bool { return candidate.ID == field.ID })].Relation
	switch {
	case relation != nil && subFieldName != "":
		nested, nestedSub, _ := strings.Cut(subFieldName, ".")
		result.dimension.NestedField, result.dimension.NestedSubField = nested, nestedSub
		result.kind = modelFieldType(relation.Target, nested)
		result.options = nil
	case relation != nil:
		result.kind = model.TypeUUID
	case len(columns) > 1:
		result.dimension.SubField = orDefault(subFieldName, columns[0].SubField)
		result.kind = model.TypeText
	}
	if result.kind == model.TypeDateTime && granularity != "NONE" {
		result.dimension.DateGranularity = records.DateGranularity(granularity)
	}
	if len(columns) == 0 && relation == nil {
		return axis{}, fmt.Errorf("%w: field %s cannot be grouped", ErrInvalidConfiguration, field.Name)
	}
	return result, nil
}

func orderedGroups(ctx context.Context, grouper Grouper, base records.GroupByQuery, by axis, omitNull bool) ([]group, bool, error) {
	query := base
	query.Dimensions = []records.GroupDimension{by.dimension}
	switch by.order {
	case "VALUE_ASC", "VALUE_DESC":
		query.OrderBy = []records.GroupOrder{{ByAggregate: true, Descending: by.order == "VALUE_DESC"}}
	case "FIELD_DESC", "FIELD_POSITION_DESC":
		query.OrderBy = []records.GroupOrder{{Descending: true}}
	}
	if by.order != "MANUAL" {
		query.Limit = maxGroups + 1
		if omitNull {
			query.Limit++
		}
	}
	rows, err := grouper.GroupBy(ctx, query)
	if err != nil {
		return nil, false, fmt.Errorf("order bar chart groups: %w", err)
	}
	groups := make([]group, 0, len(rows))
	for _, row := range rows {
		if omitNull && row.Keys[0] == nil {
			continue
		}
		groups = append(groups, describe(by, row.Keys[0]))
	}
	if by.order == "MANUAL" {
		position := func(item group) int {
			if index := slices.Index(by.manual, item.rawString); index >= 0 {
				return index
			}
			return len(by.manual)
		}
		slices.SortStableFunc(groups, func(a, b group) int { return position(a) - position(b) })
	}
	if len(groups) > maxGroups {
		return groups[:maxGroups], true, nil
	}
	return groups, false, nil
}

func describe(by axis, key any) group {
	text, ok := key.(string)
	if !ok {
		return group{label: notSetLabel, rawString: "\x00"}
	}
	return group{raw: text, rawString: text, label: formatKey(by, text)}
}

func formatKey(by axis, value string) string {
	switch by.kind {
	case model.TypeBoolean:
		return map[string]string{"true": "True", "false": "False"}[value]
	case model.TypeDateTime:
		return formatDate(value, by.dimension.DateGranularity)
	}
	if label, ok := by.options[value]; ok {
		return label
	}
	return value
}

func formatDate(value string, granularity records.DateGranularity) string {
	if len(value) > len("2006-01-02") {
		value = value[:len("2006-01-02")]
	}
	switch granularity {
	case records.GranularityDayOfTheWeek:
		var weekday int
		if _, err := fmt.Sscan(value, &weekday); err == nil && weekday >= 1 && weekday <= 7 {
			return time.Weekday(weekday % 7).String()
		}
		return value
	case records.GranularityMonthOfYear:
		var month int
		if _, err := fmt.Sscan(value, &month); err == nil && month >= 1 && month <= 12 {
			return time.Month(month).String()
		}
		return value
	case records.GranularityQuarterOfYear:
		return "Q" + value
	}
	date, err := time.Parse(time.DateOnly, value)
	if err != nil {
		return value
	}
	switch granularity {
	case records.GranularityMonth:
		return date.Format("Jan 2006")
	case records.GranularityQuarter:
		return fmt.Sprintf("Q%d %d", (int(date.Month())-1)/3+1, date.Year())
	case records.GranularityYear:
		return date.Format("2006")
	}
	return date.Format("Jan 2, 2006")
}

func number(value any, scale float64) (float64, error) {
	switch typed := value.(type) {
	case nil:
		return 0, nil
	case int64:
		return float64(typed) / scale, nil
	case int32:
		return float64(typed) / scale, nil
	case float64:
		return typed / scale, nil
	case time.Time:
		return float64(typed.UnixMilli()), nil
	}
	return 0, fmt.Errorf("%w: aggregate value %v is not a number", ErrInvalidConfiguration, value)
}
