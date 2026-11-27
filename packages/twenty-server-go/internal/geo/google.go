package geo

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"slices"
)

type googlePlaces struct {
	apiKey  string
	client  *http.Client
	baseURL string
}

type googleComponent struct {
	LongName  string   `json:"long_name"`
	ShortName string   `json:"short_name"`
	Types     []string `json:"types"`
}

func (c googleComponent) is(kind string) bool {
	return slices.Contains(c.Types, kind)
}

func getJSON(ctx context.Context, client *http.Client, target string, out any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("get %s: %w", request.URL.Host, err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 400 {
		return fmt.Errorf("get %s: status %d", request.URL.Host, response.StatusCode)
	}
	if err := json.NewDecoder(response.Body).Decode(out); err != nil {
		return fmt.Errorf("decode %s response: %w", request.URL.Host, err)
	}
	return nil
}

func (g *googlePlaces) Suggestions(ctx context.Context, query, sessionToken, country string, cityOnly bool) ([]Suggestion, error) {
	params := url.Values{"input": {query}, "key": {g.apiKey}}
	if sessionToken != "" {
		params.Set("sessiontoken", sessionToken)
	}
	if country != "" {
		params.Set("components", "country:"+country)
	}
	if cityOnly {
		params.Set("types", "(cities)")
	}
	var body struct {
		Status      string `json:"status"`
		Predictions []struct {
			Description string `json:"description"`
			PlaceID     string `json:"place_id"`
		} `json:"predictions"`
	}
	if err := getJSON(ctx, g.client, g.baseURL+"/autocomplete/json?"+params.Encode(), &body); err != nil {
		return nil, err
	}
	suggestions := []Suggestion{}
	if body.Status != "OK" {
		return suggestions, nil
	}
	for _, prediction := range body.Predictions {
		suggestions = append(suggestions, Suggestion{Text: prediction.Description, PlaceID: prediction.PlaceID})
	}
	return suggestions, nil
}

func (g *googlePlaces) Details(ctx context.Context, placeID, sessionToken string) (Address, error) {
	params := url.Values{"place_id": {placeID}, "fields": {"address_components,geometry"}, "key": {g.apiKey}}
	if sessionToken != "" {
		params.Set("sessiontoken", sessionToken)
	}
	var body struct {
		Status string `json:"status"`
		Result struct {
			Components []googleComponent `json:"address_components"`
			Geometry   struct {
				Location *Location `json:"location"`
			} `json:"geometry"`
		} `json:"result"`
	}
	if err := getJSON(ctx, g.client, g.baseURL+"/details/json?"+params.Encode(), &body); err != nil {
		return Address{}, err
	}
	if body.Status != "OK" || len(body.Result.Components) == 0 {
		return Address{}, nil
	}
	address := googleAddress(body.Result.Components)
	address.Location = body.Result.Geometry.Location
	return address, nil
}

func googleAddress(components []googleComponent) Address {
	var street, postcode, city, state, country *string
	for _, c := range components {
		switch {
		case c.is("street_number"):
			street = str(c.LongName + " " + deref(street))
		case c.is("route"):
			street = str(deref(street) + c.LongName)
		case c.is("postal_code"):
			postcode = str(c.LongName + deref(postcode))
		case c.is("postal_code_suffix"):
			postcode = str(deref(postcode) + "-" + c.LongName)
		case c.is("locality"):
			city = str(c.LongName)
		case c.is("postal_town"), c.is("administrative_area_level_3"):
			if deref(city) == "" {
				city = str(c.LongName)
			}
		case c.is("administrative_area_level_1"):
			state = str(c.LongName)
		case c.is("administrative_area_level_2"):
			if deref(state) == "" {
				state = str(c.LongName)
			}
		case c.is("country"):
			country = str(c.ShortName)
		}
	}
	return Address{Street: street, Postcode: postcode, City: city, State: state, Country: country}
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
