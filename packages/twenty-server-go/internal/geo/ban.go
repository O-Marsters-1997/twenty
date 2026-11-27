package geo

import (
	"context"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	banCountry     = "FR"
	banMinQuery    = 3
	banMaxQuery    = 200
	banResultLimit = "5"
)

var (
	banFeatureTypes = []string{"housenumber", "street", "locality", "municipality"}
	banCityCode     = regexp.MustCompile(`^[0-9][0-9AB][0-9]{3}$`)
)

type ban struct {
	client    *http.Client
	searchURL string
}

type banFeature struct {
	Geometry struct {
		Coordinates []float64 `json:"coordinates"`
	} `json:"geometry"`
	Properties struct {
		Label    string `json:"label"`
		Type     string `json:"type"`
		Name     string `json:"name"`
		Postcode string `json:"postcode"`
		CityCode string `json:"citycode"`
		City     string `json:"city"`
		Context  string `json:"context"`
	} `json:"properties"`
}

func (b *ban) Suggestions(ctx context.Context, query, _, country string, cityOnly bool) ([]Suggestion, error) {
	suggestions := []Suggestion{}
	if country != "" && country != banCountry {
		return suggestions, nil
	}
	features, err := b.search(ctx, query, cityOnly, "", "")
	if err != nil {
		return nil, err
	}
	for _, feature := range features {
		text := feature.Properties.Label
		if feature.Properties.Type == "municipality" && feature.Properties.Postcode != "" {
			text = feature.Properties.Postcode + " " + text
		}
		suggestions = append(suggestions, Suggestion{Text: text, PlaceID: banPlaceID(feature)})
	}
	return suggestions, nil
}

func (b *ban) Details(ctx context.Context, placeID, _ string) (Address, error) {
	reference, err := url.ParseQuery(placeID)
	label := reference.Get("label")
	if err != nil || label == "" {
		return Address{}, nil
	}
	citycode := reference.Get("citycode")
	if !banCityCode.MatchString(citycode) {
		citycode = ""
	}
	kind := reference.Get("type")
	if !slices.Contains(banFeatureTypes, kind) {
		kind = ""
	}
	features, err := b.search(ctx, label, false, citycode, kind)
	if err != nil || len(features) == 0 {
		return Address{}, err
	}
	match := features[0]
	for _, feature := range features {
		if feature.Properties.Label == label && (citycode == "" || feature.Properties.CityCode == citycode) {
			match = feature
			break
		}
	}
	return banAddress(match), nil
}

func (b *ban) search(ctx context.Context, query string, cityOnly bool, citycode, kind string) ([]banFeature, error) {
	query = strings.TrimSpace(query)
	if utf8.RuneCountInString(query) > banMaxQuery {
		query = string([]rune(query)[:banMaxQuery])
	}
	first, _ := utf8.DecodeRuneInString(query)
	if utf8.RuneCountInString(query) < banMinQuery || !(unicode.IsLetter(first) || unicode.IsNumber(first)) {
		return nil, nil
	}
	params := url.Values{"q": {query}, "limit": {banResultLimit}}
	if cityOnly {
		params.Set("type", "municipality")
	}
	if kind != "" {
		params.Set("type", kind)
	}
	if citycode != "" {
		params.Set("citycode", citycode)
	}
	var body struct {
		Features []banFeature `json:"features"`
	}
	if err := getJSON(ctx, b.client, b.searchURL+"?"+params.Encode(), &body); err != nil {
		return nil, err
	}
	return body.Features, nil
}

func banPlaceID(feature banFeature) string {
	params := url.Values{"label": {feature.Properties.Label}}
	if feature.Properties.CityCode != "" {
		params.Set("citycode", feature.Properties.CityCode)
	}
	if feature.Properties.Type != "" {
		params.Set("type", feature.Properties.Type)
	}
	return params.Encode()
}

func banAddress(feature banFeature) Address {
	properties := feature.Properties
	address := Address{
		City:     nonEmpty(properties.City),
		Postcode: nonEmpty(properties.Postcode),
		Country:  str(banCountry),
	}
	if properties.Type != "municipality" {
		address.Street = nonEmpty(properties.Name)
	}
	parts := strings.Split(properties.Context, ",")
	address.State = nonEmpty(strings.TrimSpace(parts[len(parts)-1]))
	if len(feature.Geometry.Coordinates) >= 2 {
		address.Location = &Location{Lng: &feature.Geometry.Coordinates[0], Lat: &feature.Geometry.Coordinates[1]}
	}
	return address
}
