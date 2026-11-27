package messaging

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
)

const googleCalendarEventsScope = "https://www.googleapis.com/auth/calendar.events"

var ErrMissingCalendarScope = errors.New("connected account lacks the calendar events scope")

type NewCalendarEvent struct {
	Title, Description, Location string
	StartsAt, EndsAt, TimeZone   string
	IsFullDay                    bool
	Attendees                    []string
	SendInvitations              bool
	AddConferencing              bool
}

type CreatedCalendarEvent struct {
	ExternalID, ICalUID, ConferenceLink string
}

func (g *GoogleCalendar) CreateEvent(ctx context.Context, accountID string, event NewCalendarEvent) (CreatedCalendarEvent, error) {
	account, err := g.google.accounts.Get(ctx, accountID)
	if err != nil {
		return CreatedCalendarEvent{}, fmt.Errorf("load connected account: %w", err)
	}
	if account.AuthFailedAt != nil {
		return CreatedCalendarEvent{}, ErrAccountAuthFailed
	}
	if !slices.Contains(account.Scopes, googleCalendarEventsScope) {
		return CreatedCalendarEvent{}, ErrMissingCalendarScope
	}
	body, err := googleEventBody(event)
	if err != nil {
		return CreatedCalendarEvent{}, err
	}
	invitations := "none"
	if event.SendInvitations {
		invitations = "all"
	}
	endpoint := g.baseURL + "/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=" + invitations

	response, err := g.post(ctx, endpoint, account.AccessToken, body)
	if err != nil {
		return CreatedCalendarEvent{}, err
	}
	if response.StatusCode == http.StatusUnauthorized {
		_ = response.Body.Close()
		if account.AccessToken, err = g.google.refresh(ctx, account); err != nil {
			return CreatedCalendarEvent{}, err
		}
		if response, err = g.post(ctx, endpoint, account.AccessToken, body); err != nil {
			return CreatedCalendarEvent{}, err
		}
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return CreatedCalendarEvent{}, fmt.Errorf("create google event: status %d", response.StatusCode)
	}
	var created struct {
		ID             string `json:"id"`
		ICalUID        string `json:"iCalUID"`
		HangoutLink    string `json:"hangoutLink"`
		ConferenceData struct {
			EntryPoints []struct {
				URI string `json:"uri"`
			} `json:"entryPoints"`
		} `json:"conferenceData"`
	}
	if err := json.NewDecoder(response.Body).Decode(&created); err != nil {
		return CreatedCalendarEvent{}, fmt.Errorf("decode google event: %w", err)
	}
	result := CreatedCalendarEvent{ExternalID: created.ID, ICalUID: created.ICalUID, ConferenceLink: created.HangoutLink}
	if result.ConferenceLink == "" && len(created.ConferenceData.EntryPoints) > 0 {
		result.ConferenceLink = created.ConferenceData.EntryPoints[0].URI
	}
	return result, nil
}

func (g *GoogleCalendar) post(ctx context.Context, endpoint, accessToken string, body []byte) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build google event request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+accessToken)
	request.Header.Set("Content-Type", "application/json")
	response, err := g.google.config.HTTPClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call google events: %w", err)
	}
	return response, nil
}

func googleEventBody(event NewCalendarEvent) ([]byte, error) {
	start, end := map[string]string{}, map[string]string{}
	if event.IsFullDay {
		start["date"], end["date"] = datePart(event.StartsAt), datePart(event.EndsAt)
	} else {
		start["dateTime"], end["dateTime"] = event.StartsAt, event.EndsAt
		if event.TimeZone != "" {
			start["timeZone"], end["timeZone"] = event.TimeZone, event.TimeZone
		}
	}
	payload := map[string]any{"summary": event.Title, "description": event.Description, "location": event.Location, "start": start, "end": end}
	if len(event.Attendees) > 0 {
		attendees := make([]map[string]string, len(event.Attendees))
		for i, address := range event.Attendees {
			attendees[i] = map[string]string{"email": address}
		}
		payload["attendees"] = attendees
	}
	if event.AddConferencing {
		requestID := make([]byte, 8)
		if _, err := rand.Read(requestID); err != nil {
			return nil, fmt.Errorf("generate conference request id: %w", err)
		}
		payload["conferenceData"] = map[string]any{"createRequest": map[string]any{
			"requestId": hex.EncodeToString(requestID), "conferenceSolutionKey": map[string]string{"type": "hangoutsMeet"},
		}}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode google event: %w", err)
	}
	return body, nil
}

func datePart(timestamp string) string {
	if len(timestamp) > len("2006-01-02") {
		return timestamp[:len("2006-01-02")]
	}
	return timestamp
}
