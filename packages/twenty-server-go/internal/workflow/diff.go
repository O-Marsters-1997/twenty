package workflow

import (
	"reflect"
	"slices"
	"strconv"
)

func Diff(oldValue, newValue any) []any {
	switch oldTyped := oldValue.(type) {
	case map[string]any:
		newTyped, ok := newValue.(map[string]any)
		if !ok {
			return nil
		}
		return diffMaps(oldTyped, newTyped)
	case []any:
		newTyped, ok := newValue.([]any)
		if !ok {
			return nil
		}
		return diffSlices(oldTyped, newTyped)
	}
	return nil
}

func diffMaps(oldMap, newMap map[string]any) []any {
	diffs := []any{}
	keys := make([]string, 0, len(oldMap))
	for key := range oldMap {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	for _, key := range keys {
		diffs = append(diffs, diffEntry(key, oldMap[key], newMap, key)...)
	}
	newKeys := make([]string, 0)
	for key := range newMap {
		if _, ok := oldMap[key]; !ok {
			newKeys = append(newKeys, key)
		}
	}
	slices.Sort(newKeys)
	for _, key := range newKeys {
		diffs = append(diffs, map[string]any{"type": "CREATE", "path": []any{key}, "value": newMap[key]})
	}
	return diffs
}

func diffSlices(oldSlice, newSlice []any) []any {
	diffs := []any{}
	for i, oldItem := range oldSlice {
		if i >= len(newSlice) {
			diffs = append(diffs, map[string]any{"type": "REMOVE", "path": []any{float64(i)}, "oldValue": oldItem})
			continue
		}
		diffs = append(diffs, diffEntry(float64(i), oldItem, map[string]any{strconv.Itoa(i): newSlice[i]}, strconv.Itoa(i))...)
	}
	for i := len(oldSlice); i < len(newSlice); i++ {
		diffs = append(diffs, map[string]any{"type": "CREATE", "path": []any{float64(i)}, "value": newSlice[i]})
	}
	return diffs
}

func diffEntry(path any, oldItem any, newContainer map[string]any, newKey string) []any {
	newItem, ok := newContainer[newKey]
	if !ok {
		return []any{map[string]any{"type": "REMOVE", "path": []any{path}, "oldValue": oldItem}}
	}
	if nested := Diff(oldItem, newItem); nested != nil {
		for _, entry := range nested {
			change := entry.(map[string]any)
			change["path"] = append([]any{path}, change["path"].([]any)...)
		}
		return nested
	}
	if reflect.DeepEqual(oldItem, newItem) {
		return nil
	}
	return []any{map[string]any{"type": "CHANGE", "path": []any{path}, "value": newItem, "oldValue": oldItem}}
}
