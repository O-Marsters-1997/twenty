package store

import (
	"encoding/json"
	"maps"
	"slices"
)

type overrides map[string]map[string]any

var (
	tabLegacyKeys    = []string{"translations", "title", "position", "icon", "isActive"}
	widgetLegacyKeys = []string{
		"translations", "title", "position", "pageLayoutTabId", "pageLayoutTabUniversalIdentifier",
		"conditionalDisplay", "conditionalAvailabilityExpression", "isActive",
	}
)

func parseAuthoredOrLegacyOverrides(raw []byte, legacyKeys []string, customApplication string) overrides {
	if len(raw) == 0 {
		return nil
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil || decoded == nil {
		return nil
	}
	for key := range decoded {
		if slices.Contains(legacyKeys, key) {
			return overrides{customApplication: decoded}
		}
	}
	result := overrides{}
	for author, entry := range decoded {
		if properties, ok := entry.(map[string]any); ok {
			result[author] = properties
		}
	}
	return result
}

func (o overrides) effective(property, owner string) (any, bool) {
	authors := make([]string, 0, len(o))
	for author := range o {
		if author != owner {
			authors = append(authors, author)
		}
	}
	slices.Sort(authors)
	authors = append(authors, owner)
	for _, author := range authors {
		if value, ok := o[author][property]; ok {
			return value, true
		}
	}
	return nil, false
}

func (o overrides) withIsActive(isActive bool, owner, customApplication string, columnIsActive bool) overrides {
	beneath := columnIsActive
	if owner != customApplication {
		if value, ok := o[owner]["isActive"].(bool); ok {
			beneath = value
		}
	}
	entry := maps.Clone(o[customApplication])
	if entry == nil {
		entry = map[string]any{}
	}
	if isActive == beneath {
		delete(entry, "isActive")
	} else {
		entry["isActive"] = isActive
	}
	next := overrides{}
	for author, properties := range o {
		if author != customApplication {
			next[author] = properties
		}
	}
	if len(entry) > 0 {
		next[customApplication] = entry
	}
	if len(next) == 0 {
		return nil
	}
	return next
}

func effectiveAs[TValue any](o overrides, property, owner string, base TValue) TValue {
	value, ok := o.effective(property, owner)
	if !ok {
		return base
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return base
	}
	var typed TValue
	if err := json.Unmarshal(encoded, &typed); err != nil {
		return base
	}
	return typed
}
