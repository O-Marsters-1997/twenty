package store

import (
	"encoding/json"
	"maps"
	"slices"
)

// entryProperties are the keys that mark a pre-authorship overrides object, where the
// object itself is the entry (Node: isLegacyNonAuthoredOverride).
var entryProperties = map[string][]string{
	"pageLayoutTab":    {"translations", "title", "position", "icon", "isActive"},
	"pageLayoutWidget": {"translations", "isActive", "title", "position", "conditionalDisplay", "conditionalAvailabilityExpression", "pageLayoutTabId", "pageLayoutTabUniversalIdentifier"},
}

type authoredOverrides map[string]map[string]json.RawMessage

func parseOverrides(metadataName string, raw json.RawMessage, customApplicationUID string) authoredOverrides {
	var object map[string]json.RawMessage
	if len(raw) == 0 || json.Unmarshal(raw, &object) != nil || object == nil {
		return nil
	}
	for key := range object {
		if slices.Contains(entryProperties[metadataName], key) {
			var entry map[string]json.RawMessage
			if json.Unmarshal(raw, &entry) != nil {
				return nil
			}
			return authoredOverrides{customApplicationUID: entry}
		}
	}
	parsed := authoredOverrides{}
	for author, rawEntry := range object {
		var entry map[string]json.RawMessage
		if json.Unmarshal(rawEntry, &entry) == nil && entry != nil {
			parsed[author] = entry
		}
	}
	return parsed
}

// effective reads a property the way Node does without an author context: every other
// application's entry first, then the owner's.
func (o authoredOverrides) effective(ownerApplicationUID, property string) (json.RawMessage, bool) {
	authors := slices.Sorted(maps.Keys(o))
	authors = slices.DeleteFunc(authors, func(author string) bool { return author == ownerApplicationUID })
	authors = append(authors, ownerApplicationUID)
	for _, author := range authors {
		if value, ok := o[author][property]; ok {
			return value, true
		}
	}
	return nil, false
}
