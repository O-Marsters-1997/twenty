package geogql_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/geo"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/geo/geogql"
)

const googleDetails = `{"status":"OK","result":{"address_components":[
	{"long_name":"10","short_name":"10","types":["street_number"]},
	{"long_name":"Downing Street","short_name":"Downing St","types":["route"]},
	{"long_name":"London","short_name":"London","types":["locality"]},
	{"long_name":"England","short_name":"England","types":["administrative_area_level_1"]},
	{"long_name":"United Kingdom","short_name":"GB","types":["country"]},
	{"long_name":"SW1A 2AA","short_name":"SW1A 2AA","types":["postal_code"]}],
	"geometry":{"location":{"lat":51.5034,"lng":-0.1276}}}}`

const googleAutocomplete = `{"status":"OK","predictions":[
	{"description":"10 Downing St, London, UK","place_id":"place-1"},
	{"description":"10 Downing Rd, Leeds, UK","place_id":"place-2"}]}`

func fakeGoogle(t *testing.T) geo.Driver {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/autocomplete/json", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		if query.Get("key") != "secret" || query.Get("input") != "10 Down" || query.Get("sessiontoken") != "tok" || query.Get("components") != "country:GB" {
			t.Errorf("autocomplete query = %v", query)
		}
		_, _ = io.WriteString(w, googleAutocomplete)
	})
	mux.HandleFunc("/details/json", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("place_id") != "place-1" {
			t.Errorf("details query = %v", r.URL.Query())
		}
		_, _ = io.WriteString(w, googleDetails)
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return geo.NewGooglePlaces("secret", server.URL, server.Client())
}

func execute(t *testing.T, driver geo.Driver, query string) any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query})
	if err != nil {
		t.Fatal(err)
	}
	handler := geogql.NewHandler(&geogql.Resolver{Driver: driver}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func golden(t *testing.T, name string) any {
	t.Helper()
	raw, err := os.ReadFile("testdata/" + name + ".json")
	if err != nil {
		t.Fatal(err)
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	return decoded
}

func TestGoogleOperations_matchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct{ name, query string }{
		{"GetAutoCompleteAddress", `query { getAutoCompleteAddress(address: "10 Down", token: "tok", country: "GB") { text placeId } }`},
		{"GetAddressDetails", `query { getAddressDetails(placeId: "place-1", token: "tok") { street state postcode city country location { lat lng } } }`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if diff := cmp.Diff(golden(t, tt.name), execute(t, fakeGoogle(t), tt.query)); diff != "" {
				t.Errorf("%s mismatch (-want +got):\n%s", tt.name, diff)
			}
		})
	}
}

func TestDisabledDriver(t *testing.T) {
	t.Parallel()
	got := execute(t, nil, `query { a: getAutoCompleteAddress(address: "x", token: "t") { text } d: getAddressDetails(placeId: "p", token: "t") { street location { lat } } }`)
	want := map[string]any{"data": map[string]any{"a": []any{}, "d": map[string]any{"street": nil, "location": nil}}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("disabled response mismatch (-want +got):\n%s", diff)
	}
}

func TestBAN(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		if query.Get("q") != "1 rue de Rivoli" || query.Get("limit") != "5" {
			t.Errorf("search query = %v", query)
		}
		_, _ = io.WriteString(w, `{"features":[{"geometry":{"coordinates":[2.35,48.86]},"properties":{"id":"x","label":"1 rue de Rivoli 75001 Paris","type":"housenumber","name":"1 rue de Rivoli","postcode":"75001","citycode":"75101","city":"Paris","context":"75, Paris, Île-de-France"}}]}`)
	}))
	t.Cleanup(server.Close)
	driver := geo.NewBAN(server.URL, server.Client())

	suggestions, err := driver.Suggestions(t.Context(), "1 rue de Rivoli", "", "FR", false)
	if err != nil {
		t.Fatal(err)
	}
	wantSuggestions := []geo.Suggestion{{Text: "1 rue de Rivoli 75001 Paris", PlaceID: "citycode=75101&label=1+rue+de+Rivoli+75001+Paris&type=housenumber"}}
	if diff := cmp.Diff(wantSuggestions, suggestions); diff != "" {
		t.Errorf("Suggestions mismatch (-want +got):\n%s", diff)
	}
	if other, err := driver.Suggestions(t.Context(), "1 rue de Rivoli", "", "GB", false); err != nil || len(other) != 0 {
		t.Errorf("Suggestions(country GB) = %v, %v, want none", other, err)
	}

	details, err := driver.Details(t.Context(), "label=1+rue+de+Rivoli&citycode=75101&type=housenumber", "")
	if err != nil {
		t.Fatal(err)
	}
	street, city, postcode, state, country, lat, lng := "1 rue de Rivoli", "Paris", "75001", "Île-de-France", "FR", 48.86, 2.35
	want := geo.Address{Street: &street, City: &city, Postcode: &postcode, State: &state, Country: &country, Location: &geo.Location{Lat: &lat, Lng: &lng}}
	if diff := cmp.Diff(want, details); diff != "" {
		t.Errorf("Details mismatch (-want +got):\n%s", diff)
	}
}
