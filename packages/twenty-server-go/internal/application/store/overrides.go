package store

import "maps"

var overrideEntryProperties = map[string]bool{"translations": true, "label": true, "icon": true, "isActive": true}

type authoredOverrides map[string]map[string]any

func authoredFromStored(raw map[string]any, custom string) authoredOverrides {
	for key := range raw {
		if overrideEntryProperties[key] {
			return authoredOverrides{custom: raw}
		}
	}
	entries := authoredOverrides{}
	for author, entry := range raw {
		if typed, ok := entry.(map[string]any); ok {
			entries[author] = typed
		}
	}
	return entries
}

func (o authoredOverrides) effective(property, custom, owner string) (any, bool) {
	for _, author := range []string{custom, owner} {
		if value, ok := o[author][property]; ok {
			return value, true
		}
	}
	return nil, false
}

func (o authoredOverrides) withActive(isActive, columnIsActive bool, custom, owner string) authoredOverrides {
	beneath := columnIsActive
	if value, ok := o[owner]["isActive"].(bool); ok {
		beneath = value
	}
	entry := maps.Clone(o[custom])
	if entry == nil {
		entry = map[string]any{}
	}
	if isActive == beneath {
		delete(entry, "isActive")
	} else {
		entry["isActive"] = isActive
	}
	next := maps.Clone(o)
	if len(entry) == 0 {
		delete(next, custom)
	} else {
		next[custom] = entry
	}
	return next
}

func (o authoredOverrides) without(author string) authoredOverrides {
	next := maps.Clone(o)
	delete(next, author)
	return next
}

func (o authoredOverrides) document() any {
	if len(o) == 0 {
		return nil
	}
	return map[string]map[string]any(o)
}
