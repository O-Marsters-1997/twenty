package recordsgql

import "github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"

func toWorkspaceMember(member records.WorkspaceMember) *WorkspaceMember {
	result := &WorkspaceMember{
		ID:               member.ID,
		Name:             &FullName{FirstName: &member.Name.FirstName, LastName: &member.Name.LastName},
		ColorScheme:      member.ColorScheme,
		UIScale:          member.UIScale,
		OpenRecordIn:     member.OpenRecordIn,
		Locale:           member.Locale,
		AvatarURL:        &member.AvatarURL,
		UserEmail:        &member.UserEmail,
		JobTitle:         &member.JobTitle,
		CalendarStartDay: member.CalendarStartDay,
		UserID:           member.UserID,
		TimeZone:         member.TimeZone,
		DateFormat:       WorkspaceMemberDateFormatEnum(member.DateFormat),
		TimeFormat:       WorkspaceMemberTimeFormatEnum(member.TimeFormat),
		NumberFormat:     WorkspaceMemberNumberFormatEnum(member.NumberFormat),
		Position:         member.Position,
		CreatedBy:        toActor(member.CreatedBy),
		UpdatedBy:        toActor(member.UpdatedBy),
		CreatedAt:        member.CreatedAt,
		UpdatedAt:        member.UpdatedAt,
		DeletedAt:        member.DeletedAt,
	}
	return result
}

type workspaceMemberInputFields struct {
	Name             *FullNameCreateInput
	ColorScheme      *string
	UIScale          *string
	OpenRecordIn     *string
	Locale           *string
	AvatarURL        *string
	UserEmail        *string
	JobTitle         *string
	CalendarStartDay *float64
	UserID           *string
	TimeZone         *string
	DateFormat       *WorkspaceMemberDateFormatEnum
	TimeFormat       *WorkspaceMemberTimeFormatEnum
	NumberFormat     *WorkspaceMemberNumberFormatEnum
}

func enumString[TEnum ~string](value *TEnum) *string {
	if value == nil {
		return nil
	}
	text := string(*value)
	return &text
}

func toWorkspaceMemberInput(in workspaceMemberInputFields) records.WorkspaceMemberInput {
	input := records.WorkspaceMemberInput{
		ColorScheme: in.ColorScheme, UIScale: in.UIScale, OpenRecordIn: in.OpenRecordIn, Locale: in.Locale, AvatarURL: in.AvatarURL,
		UserEmail: in.UserEmail, JobTitle: in.JobTitle, CalendarStartDay: in.CalendarStartDay, UserID: in.UserID, TimeZone: in.TimeZone,
		DateFormat: enumString(in.DateFormat), TimeFormat: enumString(in.TimeFormat), NumberFormat: enumString(in.NumberFormat),
	}
	if in.Name != nil {
		input.Name = &records.FullName{FirstName: deref(in.Name.FirstName), LastName: deref(in.Name.LastName)}
	}
	return input
}

func workspaceMemberInputOf(data *WorkspaceMemberCreateInput) records.WorkspaceMemberInput {
	if data == nil {
		return records.WorkspaceMemberInput{}
	}
	return toWorkspaceMemberInput(workspaceMemberInputFields{data.Name, data.ColorScheme, data.UIScale, data.OpenRecordIn, data.Locale, data.AvatarURL,
		data.UserEmail, data.JobTitle, data.CalendarStartDay, data.UserID, data.TimeZone, data.DateFormat, data.TimeFormat, data.NumberFormat})
}

func workspaceMemberUpdateInputOf(data WorkspaceMemberUpdateInput) records.WorkspaceMemberInput {
	return toWorkspaceMemberInput(workspaceMemberInputFields{data.Name, data.ColorScheme, data.UIScale, data.OpenRecordIn, data.Locale, data.AvatarURL,
		data.UserEmail, data.JobTitle, data.CalendarStartDay, data.UserID, data.TimeZone, data.DateFormat, data.TimeFormat, data.NumberFormat})
}

func workspaceMemberEdges(page records.Page[records.WorkspaceMember]) ([]*WorkspaceMemberEdge, *PageInfo) {
	return edgesOf(page, func(member records.WorkspaceMember, cursor string) *WorkspaceMemberEdge {
		return &WorkspaceMemberEdge{Node: toWorkspaceMember(member), Cursor: cursor}
	}, func(member records.WorkspaceMember) string { return member.ID })
}

func toDashboard(dashboard records.Dashboard) *Dashboard {
	return &Dashboard{
		ID:           dashboard.ID,
		Title:        &dashboard.Title,
		PageLayoutID: dashboard.PageLayoutID,
		Position:     dashboard.Position,
		CreatedBy:    toActor(dashboard.CreatedBy),
		UpdatedBy:    toActor(dashboard.UpdatedBy),
		CreatedAt:    dashboard.CreatedAt,
		UpdatedAt:    dashboard.UpdatedAt,
		DeletedAt:    dashboard.DeletedAt,
	}
}

func dashboardInputOf(data *DashboardCreateInput) records.DashboardInput {
	if data == nil {
		return records.DashboardInput{}
	}
	return records.DashboardInput{Title: data.Title, PageLayoutID: data.PageLayoutID}
}

func dashboardUpdateInputOf(data DashboardUpdateInput) records.DashboardInput {
	return records.DashboardInput{Title: data.Title, PageLayoutID: data.PageLayoutID}
}

func dashboardEdges(page records.Page[records.Dashboard]) ([]*DashboardEdge, *PageInfo) {
	return edgesOf(page, func(dashboard records.Dashboard, cursor string) *DashboardEdge {
		return &DashboardEdge{Node: toDashboard(dashboard), Cursor: cursor}
	}, func(dashboard records.Dashboard) string { return dashboard.ID })
}
