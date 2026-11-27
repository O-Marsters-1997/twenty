package chart

import (
	"slices"
	"strconv"
	"strings"
)

type RelationLabelResolution struct {
	LabelByRecordID     map[string]string
	UnresolvedRecordIDs map[string]struct{}
}

// BuildUniqueRelationLabels gives every record a distinct label: records
// sharing a label (or named like a sentinel) get "(n)" suffixes assigned in
// ascending record id order. Records without a label are unresolved.
func BuildUniqueRelationLabels(rawLabelByRecordID map[string]string, allRecordIDs []string) RelationLabelResolution {
	recordIDs := slices.Clone(allRecordIDs)
	slices.Sort(recordIDs)
	recordIDs = slices.Compact(recordIDs)

	takenLabels := map[string]struct{}{labelNotSet: {}, labelUnknown: {}}
	resolution := RelationLabelResolution{
		LabelByRecordID:     map[string]string{},
		UnresolvedRecordIDs: map[string]struct{}{},
	}
	recordIDsByLabel := map[string][]string{}
	var labelOrder []string

	for _, recordID := range recordIDs {
		rawLabel, found := rawLabelByRecordID[recordID]
		if !found || strings.TrimSpace(rawLabel) == "" {
			resolution.UnresolvedRecordIDs[recordID] = struct{}{}
			continue
		}
		if _, seen := recordIDsByLabel[rawLabel]; !seen {
			labelOrder = append(labelOrder, rawLabel)
		}
		recordIDsByLabel[rawLabel] = append(recordIDsByLabel[rawLabel], recordID)
	}

	for _, rawLabel := range labelOrder {
		ids := recordIDsByLabel[rawLabel]
		if _, taken := takenLabels[rawLabel]; len(ids) == 1 && !taken {
			takenLabels[rawLabel] = struct{}{}
			resolution.LabelByRecordID[ids[0]] = rawLabel
			continue
		}
		ordinal := 1
		for _, recordID := range ids {
			var label string
			label, ordinal = claimUniqueSuffixedLabel(rawLabel, ordinal, takenLabels)
			resolution.LabelByRecordID[recordID] = label
		}
	}
	return resolution
}

func claimUniqueSuffixedLabel(baseLabel string, startOrdinal int, takenLabels map[string]struct{}) (string, int) {
	ordinal := startOrdinal
	for {
		candidate := baseLabel + " (" + strconv.Itoa(ordinal) + ")"
		if _, taken := takenLabels[candidate]; !taken {
			takenLabels[candidate] = struct{}{}
			return candidate, ordinal + 1
		}
		ordinal++
	}
}

type AxisLookup struct {
	FormattedToRaw      map[string]RawValue
	UnresolvedRecordIDs map[string]struct{}
}

// MergeFormattedToRawLookups merges per-axis lookups, later axes winning, and
// drops entries whose raw value is an unresolved relation record id.
func MergeFormattedToRawLookups(axes []AxisLookup) map[string]RawValue {
	merged := map[string]RawValue{}
	for _, axis := range axes {
		for formatted, raw := range axis.FormattedToRaw {
			if _, unresolved := axis.UnresolvedRecordIDs[asString(raw)]; unresolved {
				continue
			}
			merged[formatted] = raw
		}
	}
	return merged
}
