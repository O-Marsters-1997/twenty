package overrides

import (
	"encoding/json"
	"maps"
	"reflect"
	"slices"
)

type Kind struct {
	Name         string
	Overridable  []string
	EntryKeys    []string
	Translatable []string
}

var CommandMenuItem = Kind{
	Name: "commandMenuItem",
	Overridable: []string{
		"label", "icon", "shortLabel", "position", "isPinned", "availabilityType",
		"availabilityObjectMetadataId", "engineComponentKey", "hotKeys", "pageLayoutId", "isActive",
	},
	EntryKeys: []string{
		"translations", "label", "icon", "shortLabel", "position", "isPinned", "availabilityType",
		"availabilityObjectMetadataId", "availabilityObjectMetadataUniversalIdentifier",
		"engineComponentKey", "hotKeys", "pageLayoutId", "pageLayoutUniversalIdentifier", "isActive",
	},
	Translatable: []string{"label", "shortLabel"},
}

var ObjectMetadata = Kind{
	Name:         "objectMetadata",
	Overridable:  []string{"isActive", "labelSingular", "labelPlural", "description", "icon", "color", "imageIdentifierFieldMetadataId"},
	EntryKeys:    []string{"translations", "isActive", "labelSingular", "labelPlural", "description", "icon", "color", "imageIdentifierFieldMetadataId"},
	Translatable: []string{"labelSingular", "labelPlural", "description"},
}

type Authors struct {
	Custom string
	Owner  string
}

type Authored map[string]map[string]any

func (kind Kind) isLegacy(raw map[string]any) bool {
	for key := range raw {
		if slices.Contains(kind.EntryKeys, key) {
			return true
		}
	}
	return false
}

func (kind Kind) Normalize(raw any, custom string) Authored {
	object, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	if kind.isLegacy(object) {
		return Authored{custom: object}
	}
	authored := Authored{}
	for author, entry := range object {
		if properties, ok := entry.(map[string]any); ok {
			authored[author] = properties
		}
	}
	return authored
}

func (authors Authors) Order() []string {
	order := []string{}
	for _, author := range []string{authors.Custom, authors.Owner} {
		if author != "" && !slices.Contains(order, author) {
			order = append(order, author)
		}
	}
	return order
}

func (kind Kind) entries(raw any, authors Authors) []map[string]any {
	object, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	entries := []map[string]any{}
	if authors.Custom != "" {
		authored := kind.Normalize(object, authors.Custom)
		for _, author := range authors.Order() {
			if entry, ok := authored[author]; ok {
				entries = append(entries, entry)
			}
		}
		return entries
	}
	if kind.isLegacy(object) {
		return []map[string]any{object}
	}
	nonOwners := []string{}
	for author := range object {
		if author != authors.Owner {
			nonOwners = append(nonOwners, author)
		}
	}
	slices.Sort(nonOwners)
	for _, author := range append(nonOwners, authors.Owner) {
		if entry, ok := object[author].(map[string]any); ok {
			entries = append(entries, entry)
		}
	}
	return entries
}

func (kind Kind) ReadProperty(raw any, path []string, authors Authors) (any, bool) {
	for _, entry := range kind.entries(raw, authors) {
		var current any = entry
		found := true
		for _, key := range path {
			object, ok := current.(map[string]any)
			if !ok {
				found = false
				break
			}
			if current, ok = object[key]; !ok {
				found = false
				break
			}
		}
		if found {
			return current, true
		}
	}
	return nil, false
}

type Update struct {
	Column    map[string]any
	Overrides Authored
}

func (kind Kind) Dispatch(updated, existing map[string]any, existingOverrides any, author string, authors Authors) Update {
	column := maps.Clone(updated)
	authored := kind.Normalize(existingOverrides, authors.Custom)
	if authored == nil {
		authored = Authored{}
	}
	order := authors.Order()
	authorIndex := slices.Index(order, author)
	beneath := map[string]any{}
	for name, entry := range authored {
		if authorIndex != -1 && slices.Index(order, name) > authorIndex {
			beneath[name] = entry
		}
	}
	readBeneath := func(property string) any {
		if value, ok := kind.ReadProperty(beneath, []string{property}, authors); ok {
			return value
		}
		return existing[property]
	}

	entry := maps.Clone(authored[author])
	if entry == nil {
		entry = map[string]any{}
	}
	for _, property := range kind.Overridable {
		value, ok := column[property]
		if !ok {
			continue
		}
		delete(column, property)
		if sameJSON(value, readBeneath(property)) {
			delete(entry, property)
		} else {
			entry[property] = value
		}
	}

	next := Authored{}
	for name, other := range authored {
		if name != author {
			next[name] = other
		}
	}
	if len(entry) > 0 {
		next[author] = entry
	}
	if len(next) == 0 {
		next = nil
	}
	return Update{Column: column, Overrides: next}
}

type Entity struct {
	ApplicationUniversalIdentifier string
	IsSystemSideEffect             bool
	Values                         map[string]any
	Overrides                      any
}

func IsCallerOverriding(caller, entityApplication, custom string, isSystemSideEffect bool) bool {
	if caller != custom {
		return false
	}
	return entityApplication != custom || isSystemSideEffect
}

func (kind Kind) DispatchIsActive(entity Entity, isActive bool, author, custom string) (update Update, overridden bool) {
	if !IsCallerOverriding(author, entity.ApplicationUniversalIdentifier, custom, entity.IsSystemSideEffect) {
		return Update{Column: map[string]any{"isActive": isActive}}, false
	}
	authors := Authors{Custom: custom, Owner: entity.ApplicationUniversalIdentifier}
	return kind.Dispatch(map[string]any{"isActive": isActive}, entity.Values, entity.Overrides, author, authors), true
}

func (kind Kind) Reset(raw any, author, custom string) Authored {
	authored := kind.Normalize(raw, custom)
	delete(authored, author)
	if len(authored) == 0 {
		return nil
	}
	return authored
}

func sameJSON(a, b any) bool {
	if reflect.DeepEqual(a, b) {
		return true
	}
	encodedA, errA := json.Marshal(a)
	encodedB, errB := json.Marshal(b)
	return errA == nil && errB == nil && string(encodedA) == string(encodedB)
}
