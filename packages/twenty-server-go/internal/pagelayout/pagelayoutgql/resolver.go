package pagelayoutgql

import (
	"context"
	"encoding/json"
	"fmt"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/store"
)

type Resolver struct {
	PageLayouts *store.PageLayouts
	Permissions *accessstore.Permissions
}

var widgetConfigurations = map[string]func() WidgetConfiguration{
	"BAR_CHART":                func() WidgetConfiguration { return &BarChartConfiguration{} },
	"LINE_CHART":               func() WidgetConfiguration { return &LineChartConfiguration{} },
	"PIE_CHART":                func() WidgetConfiguration { return &PieChartConfiguration{} },
	"AGGREGATE_CHART":          func() WidgetConfiguration { return &AggregateChartConfiguration{} },
	"IFRAME":                   func() WidgetConfiguration { return &IframeConfiguration{} },
	"STANDALONE_RICH_TEXT":     func() WidgetConfiguration { return &StandaloneRichTextConfiguration{} },
	"CALENDAR":                 func() WidgetConfiguration { return &CalendarConfiguration{} },
	"EMAILS":                   func() WidgetConfiguration { return &EmailsConfiguration{} },
	"EMAIL_THREAD":             func() WidgetConfiguration { return &EmailThreadConfiguration{} },
	"CHAT_THREADS":             func() WidgetConfiguration { return &ChatThreadsConfiguration{} },
	"CHAT":                     func() WidgetConfiguration { return &ChatConfiguration{} },
	"MESSAGE_CAMPAIGN_BODY":    func() WidgetConfiguration { return &MessageCampaignBodyConfiguration{} },
	"MESSAGE_CAMPAIGN_DETAILS": func() WidgetConfiguration { return &MessageCampaignDetailsConfiguration{} },
	"FIELD":                    func() WidgetConfiguration { return &FieldConfiguration{} },
	"FIELD_RICH_TEXT":          func() WidgetConfiguration { return &FieldRichTextConfiguration{} },
	"FIELDS":                   func() WidgetConfiguration { return &FieldsConfiguration{} },
	"FORM_FIELD":               func() WidgetConfiguration { return &FormFieldConfiguration{} },
	"FILES":                    func() WidgetConfiguration { return &FilesConfiguration{} },
	"NOTES":                    func() WidgetConfiguration { return &NotesConfiguration{} },
	"TASKS":                    func() WidgetConfiguration { return &TasksConfiguration{} },
	"TIMELINE":                 func() WidgetConfiguration { return &TimelineConfiguration{} },
	"VIEW":                     func() WidgetConfiguration { return &ViewConfiguration{} },
	"RECORD_TABLE":             func() WidgetConfiguration { return &RecordTableConfiguration{} },
	"WORKFLOW":                 func() WidgetConfiguration { return &WorkflowConfiguration{} },
	"WORKFLOW_RUN":             func() WidgetConfiguration { return &WorkflowRunConfiguration{} },
	"WORKFLOW_VERSION":         func() WidgetConfiguration { return &WorkflowVersionConfiguration{} },
}

func (r *pageLayoutWidgetResolver) Configuration(_ context.Context, widget *store.Widget) (WidgetConfiguration, error) {
	var header struct {
		ConfigurationType string `json:"configurationType"`
	}
	if err := json.Unmarshal(widget.Configuration, &header); err != nil {
		return nil, fmt.Errorf("decode widget configuration type: %w", err)
	}
	build, ok := widgetConfigurations[header.ConfigurationType]
	if !ok {
		return nil, fmt.Errorf("unknown widget configuration type %q", header.ConfigurationType)
	}
	configuration := build()
	if err := json.Unmarshal(widget.Configuration, configuration); err != nil {
		return nil, fmt.Errorf("decode widget configuration: %w", err)
	}
	return configuration, nil
}

func (r *pageLayoutWidgetResolver) Position(_ context.Context, widget *store.Widget) (PageLayoutWidgetPosition, error) {
	if len(widget.Position) == 0 || string(widget.Position) == "null" {
		return nil, nil
	}
	var header struct {
		LayoutMode string `json:"layoutMode"`
	}
	if err := json.Unmarshal(widget.Position, &header); err != nil {
		return nil, fmt.Errorf("decode widget position mode: %w", err)
	}
	var position PageLayoutWidgetPosition
	switch header.LayoutMode {
	case "GRID":
		position = &PageLayoutWidgetGridPosition{}
	case "VERTICAL_LIST":
		position = &PageLayoutWidgetVerticalListPosition{}
	case "CANVAS":
		position = &PageLayoutWidgetCanvasPosition{}
	default:
		return nil, fmt.Errorf("unknown widget layout mode %q", header.LayoutMode)
	}
	if err := json.Unmarshal(widget.Position, position); err != nil {
		return nil, fmt.Errorf("decode widget position: %w", err)
	}
	return position, nil
}

func (r *mutationResolver) UpdatePageLayoutWidget(ctx context.Context, id string, input map[string]any) (*store.Widget, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return nil, auth.ErrUnauthenticated
	}
	allowed, err := r.Permissions.Has(ctx, principal, store.FlagLayouts)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, fmt.Errorf("%w: missing the %s permission", accessstore.ErrForbidden, store.FlagLayouts)
	}
	isActive, ok := input["isActive"].(*bool)
	if !ok || isActive == nil || len(input) != 1 {
		return nil, fmt.Errorf("%w: only isActive can be updated here", metadata.ErrInvalidInput)
	}
	widget, err := r.PageLayouts.SetWidgetActive(ctx, id, *isActive)
	if err != nil {
		return nil, err
	}
	return &widget, nil
}

func (r *queryResolver) GetPageLayouts(ctx context.Context, objectMetadataID *string, pageLayoutType *string) ([]*store.PageLayout, error) {
	layouts, err := r.PageLayouts.List(ctx, deref(objectMetadataID), deref(pageLayoutType))
	if err != nil {
		return nil, err
	}
	listed := make([]*store.PageLayout, len(layouts))
	for i := range layouts {
		listed[i] = &layouts[i]
	}
	return listed, nil
}

func (r *queryResolver) GetPageLayout(ctx context.Context, id string) (*store.PageLayout, error) {
	layout, err := r.PageLayouts.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return &layout, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) PageLayoutWidget() PageLayoutWidgetResolver {
	return &pageLayoutWidgetResolver{r}
}

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver         struct{ *Resolver }
	pageLayoutWidgetResolver struct{ *Resolver }
	queryResolver            struct{ *Resolver }
)

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
