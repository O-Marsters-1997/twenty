package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const defaultCalendarAPIURL = "https://www.googleapis.com"

type GoogleCalendar struct {
	google  *Gmail
	baseURL string
}

var _ CalendarSource = (*GoogleCalendar)(nil)

func NewGoogleCalendar(accounts Accounts, config GmailConfig) *GoogleCalendar {
	baseURL := config.APIURL
	if baseURL == "" {
		baseURL = defaultCalendarAPIURL
	}
	return &GoogleCalendar{google: NewGmail(accounts, config), baseURL: baseURL}
}

type googleEventTime struct {
	DateTime string `json:"dateTime"`
	Date     string `json:"date"`
}

type googleEvent struct {
	ID          string          `json:"id"`
	Status      string          `json:"status"`
	Summary     string          `json:"summary"`
	Description string          `json:"description"`
	Location    string          `json:"location"`
	Start       googleEventTime `json:"start"`
	End         googleEventTime `json:"end"`
	Attendees   []struct {
		Email string `json:"email"`
	} `json:"attendees"`
	ConferenceData struct {
		EntryPoints []struct {
			URI string `json:"uri"`
		} `json:"entryPoints"`
	} `json:"conferenceData"`
}

type googleEventPage struct {
	Items         []googleEvent `json:"items"`
	NextPageToken string        `json:"nextPageToken"`
	NextSyncToken string        `json:"nextSyncToken"`
}

func (g *GoogleCalendar) ListChanges(ctx context.Context, account ConnectedAccount, since SyncCursor) ([]ImportedEvent, SyncCursor, error) {
	var events []ImportedEvent
	pageToken := ""
	for {
		page, err := g.fetchPage(ctx, &account, since, pageToken)
		if err != nil {
			return nil, "", err
		}
		for _, item := range page.Items {
			event, err := item.toImported()
			if err != nil {
				return nil, "", fmt.Errorf("event %s: %w", item.ID, err)
			}
			events = append(events, event)
		}
		if page.NextPageToken == "" {
			return events, SyncCursor(page.NextSyncToken), nil
		}
		pageToken = page.NextPageToken
	}
}

func (g *GoogleCalendar) fetchPage(ctx context.Context, account *ConnectedAccount, since SyncCursor, pageToken string) (googleEventPage, error) {
	query := url.Values{"maxResults": {"500"}, "singleEvents": {"true"}, "showDeleted": {"true"}}
	if since != "" {
		query.Set("syncToken", string(since))
	}
	if pageToken != "" {
		query.Set("pageToken", pageToken)
	}
	endpoint := g.baseURL + "/calendar/v3/calendars/primary/events?" + query.Encode()

	response, err := g.get(ctx, endpoint, account.AccessToken)
	if err != nil {
		return googleEventPage{}, err
	}
	if response.StatusCode == http.StatusUnauthorized {
		_ = response.Body.Close()
		if account.AccessToken, err = g.google.refresh(ctx, *account); err != nil {
			return googleEventPage{}, err
		}
		if response, err = g.get(ctx, endpoint, account.AccessToken); err != nil {
			return googleEventPage{}, err
		}
	}
	defer func() { _ = response.Body.Close() }()
	switch response.StatusCode {
	case http.StatusOK:
	case http.StatusGone:
		return googleEventPage{}, ErrSyncCursorExpired
	default:
		return googleEventPage{}, fmt.Errorf("list google events: status %d", response.StatusCode)
	}
	var page googleEventPage
	if err := json.NewDecoder(response.Body).Decode(&page); err != nil {
		return googleEventPage{}, fmt.Errorf("decode google events: %w", err)
	}
	return page, nil
}

func (g *GoogleCalendar) get(ctx context.Context, endpoint, accessToken string) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build google events request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	response, err := g.google.config.HTTPClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call google events: %w", err)
	}
	return response, nil
}

func (e googleEvent) toImported() (ImportedEvent, error) {
	event := ImportedEvent{
		ExternalID:  e.ID,
		Title:       e.Summary,
		Description: e.Description,
		Location:    e.Location,
		IsCanceled:  e.Status == "cancelled",
		IsFullDay:   e.Start.Date != "",
	}
	if len(e.ConferenceData.EntryPoints) > 0 {
		event.ConferenceLink = e.ConferenceData.EntryPoints[0].URI
	}
	for _, attendee := range e.Attendees {
		if attendee.Email != "" {
			event.Participants = append(event.Participants, strings.ToLower(attendee.Email))
		}
	}
	var err error
	if event.StartsAt, err = e.Start.parse(); err != nil {
		return ImportedEvent{}, fmt.Errorf("parse start: %w", err)
	}
	if event.EndsAt, err = e.End.parse(); err != nil {
		return ImportedEvent{}, fmt.Errorf("parse end: %w", err)
	}
	return event, nil
}

func (t googleEventTime) parse() (time.Time, error) {
	switch {
	case t.DateTime != "":
		return time.Parse(time.RFC3339, t.DateTime)
	case t.Date != "":
		return time.Parse(time.DateOnly, t.Date)
	}
	return time.Time{}, nil
}
