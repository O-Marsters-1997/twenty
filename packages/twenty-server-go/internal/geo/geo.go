package geo

import (
	"context"
	"fmt"
	"net/http"
)

const (
	DriverGooglePlaces = "GOOGLE_PLACES"
	DriverBAN          = "BASE_ADRESSE_NATIONALE"

	googlePlacesURL = "https://maps.googleapis.com/maps/api/place"
	banSearchURL    = "https://data.geopf.fr/geocodage/search"
)

type Suggestion struct {
	Text    string `json:"text"`
	PlaceID string `json:"placeId"`
}

type Location struct {
	Lat *float64 `json:"lat"`
	Lng *float64 `json:"lng"`
}

type Address struct {
	Street   *string   `json:"street"`
	State    *string   `json:"state"`
	Postcode *string   `json:"postcode"`
	City     *string   `json:"city"`
	Country  *string   `json:"country"`
	Location *Location `json:"location"`
}

type Driver interface {
	Suggestions(ctx context.Context, query, sessionToken, country string, cityOnly bool) ([]Suggestion, error)
	Details(ctx context.Context, placeID, sessionToken string) (Address, error)
}

type Config struct {
	Enabled      bool
	Driver       string
	GoogleAPIKey string
}

// NewDriver returns nil when autocomplete is disabled or Google Places has no API key, as Node does.
func NewDriver(cfg Config, client *http.Client) (Driver, error) {
	if !cfg.Enabled {
		return nil, nil
	}
	switch cfg.Driver {
	case DriverGooglePlaces:
		if cfg.GoogleAPIKey == "" {
			return nil, nil
		}
		return &googlePlaces{apiKey: cfg.GoogleAPIKey, client: client, baseURL: googlePlacesURL}, nil
	case DriverBAN:
		return &ban{client: client, searchURL: banSearchURL}, nil
	default:
		return nil, fmt.Errorf("invalid address autocomplete driver %q", cfg.Driver)
	}
}

func str(value string) *string { return &value }

func nonEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func NewGooglePlaces(apiKey, baseURL string, client *http.Client) Driver {
	return &googlePlaces{apiKey: apiKey, client: client, baseURL: baseURL}
}

func NewBAN(searchURL string, client *http.Client) Driver {
	return &ban{client: client, searchURL: searchURL}
}
