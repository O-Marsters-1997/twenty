package pagelayoutgql

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pagelayout/store"
)

type Resolver struct {
	Store *store.Store
}

var configurationByType = map[WidgetConfigurationType]func() WidgetConfiguration{
	WidgetConfigurationTypeAggregateChart:         func() WidgetConfiguration { return &AggregateChartConfiguration{} },
	WidgetConfigurationTypeBarChart:               func() WidgetConfiguration { return &BarChartConfiguration{} },
	WidgetConfigurationTypeCalendar:               func() WidgetConfiguration { return &CalendarConfiguration{} },
	WidgetConfigurationTypeChat:                   func() WidgetConfiguration { return &ChatConfiguration{} },
	WidgetConfigurationTypeChatThreads:            func() WidgetConfiguration { return &ChatThreadsConfiguration{} },
	WidgetConfigurationTypeEmails:                 func() WidgetConfiguration { return &EmailsConfiguration{} },
	WidgetConfigurationTypeEmailThread:            func() WidgetConfiguration { return &EmailThreadConfiguration{} },
	WidgetConfigurationTypeField:                  func() WidgetConfiguration { return &FieldConfiguration{} },
	WidgetConfigurationTypeFields:                 func() WidgetConfiguration { return &FieldsConfiguration{} },
	WidgetConfigurationTypeFieldRichText:          func() WidgetConfiguration { return &FieldRichTextConfiguration{} },
	WidgetConfigurationTypeFiles:                  func() WidgetConfiguration { return &FilesConfiguration{} },
	WidgetConfigurationTypeFormField:              func() WidgetConfiguration { return &FormFieldConfiguration{} },
	WidgetConfigurationTypeIframe:                 func() WidgetConfiguration { return &IframeConfiguration{} },
	WidgetConfigurationTypeLineChart:              func() WidgetConfiguration { return &LineChartConfiguration{} },
	WidgetConfigurationTypeMessageCampaignBody:    func() WidgetConfiguration { return &MessageCampaignBodyConfiguration{} },
	WidgetConfigurationTypeMessageCampaignDetails: func() WidgetConfiguration { return &MessageCampaignDetailsConfiguration{} },
	WidgetConfigurationTypeNotes:                  func() WidgetConfiguration { return &NotesConfiguration{} },
	WidgetConfigurationTypePieChart:               func() WidgetConfiguration { return &PieChartConfiguration{} },
	WidgetConfigurationTypeRecordTable:            func() WidgetConfiguration { return &RecordTableConfiguration{} },
	WidgetConfigurationTypeStandaloneRichText:     func() WidgetConfiguration { return &StandaloneRichTextConfiguration{} },
	WidgetConfigurationTypeTasks:                  func() WidgetConfiguration { return &TasksConfiguration{} },
	WidgetConfigurationTypeTimeline:               func() WidgetConfiguration { return &TimelineConfiguration{} },
	WidgetConfigurationTypeView:                   func() WidgetConfiguration { return &ViewConfiguration{} },
	WidgetConfigurationTypeWorkflow:               func() WidgetConfiguration { return &WorkflowConfiguration{} },
	WidgetConfigurationTypeWorkflowRun:            func() WidgetConfiguration { return &WorkflowRunConfiguration{} },
	WidgetConfigurationTypeWorkflowVersion:        func() WidgetConfiguration { return &WorkflowVersionConfiguration{} },
}

func principal(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok {
		return auth.Principal{}, auth.ErrUnauthenticated
	}
	return principal, nil
}

func (r *queryResolver) GetPageLayouts(ctx context.Context, objectMetadataID *string, pageLayoutType *PageLayoutType) ([]*PageLayout, error) {
	caller, err := principal(ctx)
	if err != nil {
		return nil, err
	}
	var layoutType string
	if pageLayoutType != nil {
		layoutType = string(*pageLayoutType)
	}
	var objectID string
	if objectMetadataID != nil {
		objectID = *objectMetadataID
	}
	layouts, err := r.Store.Layouts(ctx, caller.WorkspaceID, layoutType, objectID)
	if err != nil {
		return nil, err
	}
	result := make([]*PageLayout, 0, len(layouts))
	for _, layout := range layouts {
		converted, err := toLayout(layout)
		if err != nil {
			return nil, err
		}
		result = append(result, converted)
	}
	return result, nil
}

func (r *queryResolver) GetPageLayout(ctx context.Context, id string) (*PageLayout, error) {
	caller, err := principal(ctx)
	if err != nil {
		return nil, err
	}
	layout, err := r.Store.Layout(ctx, caller.WorkspaceID, id)
	if err != nil {
		return nil, err
	}
	return toLayout(layout)
}

func (r *mutationResolver) UpdatePageLayoutWidget(ctx context.Context, id string, input UpdatePageLayoutWidgetInput) (*PageLayoutWidget, error) {
	caller, err := principal(ctx)
	if err != nil {
		return nil, err
	}
	granted, err := r.Store.HasLayoutsPermission(ctx, caller.UserWorkspaceID, caller.APIKeyID)
	if err != nil {
		return nil, err
	}
	if !granted {
		return nil, store.ErrPermissionDenied
	}
	onlyIsActive := input.IsActive != nil && input.PageLayoutTabID == nil && input.Title == nil && input.Type == nil &&
		input.ObjectMetadataID == nil && input.Position == nil && input.Configuration == nil &&
		input.ConditionalDisplay == nil && input.ConditionalAvailabilityExpression == nil
	if !onlyIsActive {
		return nil, errUnsupportedUpdate
	}
	widget, err := r.Store.SetWidgetIsActive(ctx, caller.WorkspaceID, id, *input.IsActive)
	if err != nil {
		return nil, err
	}
	return toWidget(widget)
}

func (r *mutationResolver) UpdatePageLayoutWithTabsAndWidgets(ctx context.Context, id string, input UpdatePageLayoutWithTabsInput) (*PageLayout, error) {
	caller, err := principal(ctx)
	if err != nil {
		return nil, err
	}
	granted, err := r.Store.HasLayoutsPermission(ctx, caller.UserWorkspaceID, caller.APIKeyID)
	if err != nil {
		return nil, err
	}
	if !granted {
		return nil, store.ErrPermissionDenied
	}
	layoutInput := store.LayoutInput{
		Name: input.Name, Type: string(input.Type), ObjectMetadataID: input.ObjectMetadataID, IsFirstTabPinned: input.IsFirstTabPinned,
	}
	for _, tab := range input.Tabs {
		tabInput := store.TabInput{ID: tab.ID, Title: tab.Title, Position: tab.Position, Icon: tab.Icon}
		if tab.LayoutMode != nil {
			layoutMode := string(*tab.LayoutMode)
			tabInput.LayoutMode = &layoutMode
		}
		for _, widget := range tab.Widgets {
			tabInput.Widgets = append(tabInput.Widgets, store.WidgetInput{
				ID: widget.ID, PageLayoutTabID: widget.PageLayoutTabID, Title: widget.Title, Type: string(widget.Type),
				ObjectMetadataID: widget.ObjectMetadataID, Position: widget.Position, Configuration: widget.Configuration,
				ConditionalAvailabilityExpression: widget.ConditionalAvailabilityExpression, ConditionalDisplay: widget.ConditionalDisplay,
			})
		}
		layoutInput.Tabs = append(layoutInput.Tabs, tabInput)
	}
	layout, err := r.Store.UpdateLayout(ctx, caller.WorkspaceID, id, layoutInput)
	if err != nil {
		return nil, err
	}
	return toLayout(layout)
}

func (r *mutationResolver) DuplicateDashboard(ctx context.Context, id string) (*DuplicatedDashboard, error) {
	caller, err := principal(ctx)
	if err != nil {
		return nil, err
	}
	duplicated, err := r.Store.DuplicateDashboard(ctx, caller.WorkspaceID, id, caller.WorkspaceMemberID)
	if err != nil {
		return nil, err
	}
	const isoMillis = "2006-01-02T15:04:05.000Z"
	return &DuplicatedDashboard{
		ID: duplicated.ID, Title: &duplicated.Title, PageLayoutID: &duplicated.PageLayoutID, Position: duplicated.Position,
		CreatedAt: duplicated.CreatedAt.UTC().Format(isoMillis), UpdatedAt: duplicated.UpdatedAt.UTC().Format(isoMillis),
	}, nil
}

func toLayout(layout store.Layout) (*PageLayout, error) {
	tabs := make([]*PageLayoutTab, 0, len(layout.Tabs))
	for _, tab := range layout.Tabs {
		converted, err := toTab(tab)
		if err != nil {
			return nil, err
		}
		tabs = append(tabs, converted)
	}
	return &PageLayout{
		ID: layout.ID, Name: layout.Name, Type: PageLayoutType(layout.Type), ObjectMetadataID: layout.ObjectMetadataID,
		Tabs: tabs, DefaultTabToFocusOnMobileAndSidePanelID: layout.DefaultTabID,
		UniversalIdentifier: layout.UniversalIdentifier, ApplicationID: layout.ApplicationID,
		IsSystemSideEffect: layout.IsSystemSideEffect, IsFirstTabPinned: layout.IsFirstTabPinned,
		CreatedAt: metadata.Timestamp{Time: layout.CreatedAt}, UpdatedAt: metadata.Timestamp{Time: layout.UpdatedAt},
	}, nil
}

func toTab(tab store.Tab) (*PageLayoutTab, error) {
	widgets := make([]*PageLayoutWidget, 0, len(tab.Widgets))
	for _, widget := range tab.Widgets {
		converted, err := toWidget(widget)
		if err != nil {
			return nil, err
		}
		widgets = append(widgets, converted)
	}
	layoutMode := PageLayoutTabLayoutMode(tab.LayoutMode)
	notOverridden := false
	return &PageLayoutTab{
		ID: tab.ID, UniversalIdentifier: tab.UniversalIdentifier, IsSystemSideEffect: tab.IsSystemSideEffect,
		ApplicationID: tab.ApplicationID, Title: tab.Title, Position: tab.Position, PageLayoutID: tab.PageLayoutID,
		Widgets: widgets, Icon: tab.Icon, LayoutMode: &layoutMode,
		CreatedAt: metadata.Timestamp{Time: tab.CreatedAt}, UpdatedAt: metadata.Timestamp{Time: tab.UpdatedAt},
		IsActive: tab.IsActive, IsOverridden: &notOverridden,
	}, nil
}

func toWidget(widget store.Widget) (*PageLayoutWidget, error) {
	configuration, err := decodeConfiguration(widget.Configuration)
	if err != nil {
		return nil, fmt.Errorf("decode configuration of widget %s: %w", widget.ID, err)
	}
	position, err := decodePosition(widget.Position)
	if err != nil {
		return nil, fmt.Errorf("decode position of widget %s: %w", widget.ID, err)
	}
	var gridPosition *GridPosition
	if isPresent(widget.GridPosition) {
		gridPosition = &GridPosition{}
		if err := json.Unmarshal(widget.GridPosition, gridPosition); err != nil {
			return nil, fmt.Errorf("decode grid position of widget %s: %w", widget.ID, err)
		}
	}
	var conditionalDisplay any
	if isPresent(widget.ConditionalDisplay) {
		if err := json.Unmarshal(widget.ConditionalDisplay, &conditionalDisplay); err != nil {
			return nil, fmt.Errorf("decode conditional display of widget %s: %w", widget.ID, err)
		}
	}
	notOverridden := false
	return &PageLayoutWidget{
		ID: widget.ID, UniversalIdentifier: widget.UniversalIdentifier, IsSystemSideEffect: widget.IsSystemSideEffect,
		ApplicationID: widget.ApplicationID, PageLayoutTabID: widget.PageLayoutTabID, Title: widget.Title,
		Type: WidgetType(widget.Type), ObjectMetadataID: widget.ObjectMetadataID, GridPosition: gridPosition,
		Position: position, Configuration: configuration, ConditionalDisplay: conditionalDisplay,
		ConditionalAvailabilityExpression: widget.ConditionalAvailabilityExpression,
		CreatedAt:                         metadata.Timestamp{Time: widget.CreatedAt}, UpdatedAt: metadata.Timestamp{Time: widget.UpdatedAt},
		IsActive: widget.IsActive, IsOverridden: &notOverridden,
	}, nil
}

func isPresent(raw json.RawMessage) bool {
	return len(raw) > 0 && string(raw) != "null"
}

func decodeConfiguration(raw json.RawMessage) (WidgetConfiguration, error) {
	var header struct {
		ConfigurationType WidgetConfigurationType `json:"configurationType"`
	}
	if err := json.Unmarshal(raw, &header); err != nil {
		return nil, fmt.Errorf("read configuration type: %w", err)
	}
	newConfiguration, ok := configurationByType[header.ConfigurationType]
	if !ok {
		return nil, fmt.Errorf("unknown configuration type %q", header.ConfigurationType)
	}
	configuration := newConfiguration()
	if err := json.Unmarshal(raw, configuration); err != nil {
		return nil, fmt.Errorf("decode %s configuration: %w", header.ConfigurationType, err)
	}
	return configuration, nil
}

func decodePosition(raw json.RawMessage) (PageLayoutWidgetPosition, error) {
	if !isPresent(raw) {
		return nil, nil
	}
	var header struct {
		LayoutMode PageLayoutTabLayoutMode `json:"layoutMode"`
	}
	if err := json.Unmarshal(raw, &header); err != nil {
		return nil, fmt.Errorf("read layout mode: %w", err)
	}
	var position PageLayoutWidgetPosition
	switch header.LayoutMode {
	case PageLayoutTabLayoutModeGrid:
		position = &PageLayoutWidgetGridPosition{}
	case PageLayoutTabLayoutModeVerticalList:
		position = &PageLayoutWidgetVerticalListPosition{}
	case PageLayoutTabLayoutModeCanvas:
		position = &PageLayoutWidgetCanvasPosition{}
	default:
		return nil, fmt.Errorf("unknown layout mode %q", header.LayoutMode)
	}
	if err := json.Unmarshal(raw, position); err != nil {
		return nil, fmt.Errorf("decode %s position: %w", header.LayoutMode, err)
	}
	return position, nil
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)
