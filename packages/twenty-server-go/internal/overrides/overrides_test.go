package overrides_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/overrides"
)

const (
	custom   = "custom-app"
	owner    = "owner-app"
	standard = "standard-app-id"
)

var kind = overrides.CommandMenuItem

type fakeTranslator map[string]string

func (translator fakeTranslator) Translate(messageID string, _ map[string]string) string {
	if translated, ok := translator[messageID]; ok {
		return translated
	}
	return messageID
}

func TestMessageID(t *testing.T) {
	for message, want := range map[string]string{
		"A company":                            "kZR6+h",
		"12HRS":                                "0eYXBl",
		"{fieldType} fields cannot be unique.": "ZkHTHm",
	} {
		if got := overrides.MessageID(message, ""); got != want {
			t.Errorf("MessageID(%q) = %q, want %q", message, got, want)
		}
	}
	if overrides.MessageID("Export", "commandMenuItem.shortLabel") == overrides.MessageID("Export", "view.name") {
		t.Error("context must change the id")
	}
}

func TestKind_Normalize(t *testing.T) {
	legacy := map[string]any{"label": "Mine"}
	if diff := cmp.Diff(overrides.Authored{custom: legacy}, kind.Normalize(legacy, custom)); diff != "" {
		t.Errorf("legacy entry attributed to custom (-want +got):\n%s", diff)
	}
	authored := map[string]any{owner: map[string]any{"label": "Owner"}}
	if diff := cmp.Diff(overrides.Authored{owner: {"label": "Owner"}}, kind.Normalize(authored, custom)); diff != "" {
		t.Errorf("authored kept (-want +got):\n%s", diff)
	}
	if kind.Normalize("nope", custom) != nil || kind.Normalize(nil, custom) != nil {
		t.Error("non-object overrides normalize to nil")
	}
}

func TestKind_ReadProperty(t *testing.T) {
	raw := map[string]any{
		owner:  map[string]any{"label": "Owner", "icon": "IconOwner"},
		custom: map[string]any{"label": "Custom"},
	}
	authors := overrides.Authors{Custom: custom, Owner: owner}

	t.Run("custom outranks owner", func(t *testing.T) {
		for property, want := range map[string]any{"label": "Custom", "icon": "IconOwner"} {
			got, ok := kind.ReadProperty(raw, []string{property}, authors)
			if !ok || got != want {
				t.Errorf("%s = %v, %v; want %v", property, got, ok, want)
			}
		}
		if _, ok := kind.ReadProperty(raw, []string{"position"}, authors); ok {
			t.Error("absent property must not be found")
		}
	})

	t.Run("without a custom application", func(t *testing.T) {
		ownerOnly := overrides.Authors{Owner: owner}
		if got, _ := kind.ReadProperty(map[string]any{"label": "Legacy"}, []string{"label"}, ownerOnly); got != "Legacy" {
			t.Errorf("legacy = %v", got)
		}
		authored := map[string]any{
			owner:   map[string]any{"label": "Owner"},
			"other": map[string]any{"label": "Other"},
		}
		if got, _ := kind.ReadProperty(authored, []string{"label"}, ownerOnly); got != "Other" {
			t.Errorf("non-owner entries outrank owner, got %v", got)
		}
	})
}

func TestKind_Dispatch(t *testing.T) {
	authors := overrides.Authors{Custom: custom, Owner: owner}
	existing := map[string]any{"label": "Base", "icon": "IconBase"}

	t.Run("override moves out of the columns", func(t *testing.T) {
		update := kind.Dispatch(map[string]any{"label": "New", "unrelated": 1}, existing, nil, custom, authors)
		if diff := cmp.Diff(map[string]any{"unrelated": 1}, update.Column); diff != "" {
			t.Errorf("column (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff(overrides.Authored{custom: {"label": "New"}}, update.Overrides); diff != "" {
			t.Errorf("overrides (-want +got):\n%s", diff)
		}
	})

	t.Run("a value equal to the one beneath reverts the override", func(t *testing.T) {
		existingOverrides := map[string]any{custom: map[string]any{"label": "New"}}
		update := kind.Dispatch(map[string]any{"label": "Base"}, existing, existingOverrides, custom, authors)
		if update.Overrides != nil {
			t.Errorf("overrides = %v, want nil", update.Overrides)
		}
	})

	t.Run("the owner entry beneath is the revert target", func(t *testing.T) {
		existingOverrides := map[string]any{
			owner:  map[string]any{"label": "Owner"},
			custom: map[string]any{"label": "Custom"},
		}
		update := kind.Dispatch(map[string]any{"label": "Owner"}, existing, existingOverrides, custom, authors)
		if diff := cmp.Diff(overrides.Authored{owner: {"label": "Owner"}}, update.Overrides); diff != "" {
			t.Errorf("overrides (-want +got):\n%s", diff)
		}
	})

	t.Run("numbers compare equal across JSON and Go types", func(t *testing.T) {
		update := kind.Dispatch(map[string]any{"position": 3}, map[string]any{"position": float64(3)}, nil, custom, authors)
		if update.Overrides != nil {
			t.Errorf("overrides = %v, want nil", update.Overrides)
		}
	})

	t.Run("other authors are preserved", func(t *testing.T) {
		existingOverrides := map[string]any{owner: map[string]any{"icon": "IconOwner"}}
		update := kind.Dispatch(map[string]any{"label": "New"}, existing, existingOverrides, custom, authors)
		want := overrides.Authored{owner: {"icon": "IconOwner"}, custom: {"label": "New"}}
		if diff := cmp.Diff(want, update.Overrides); diff != "" {
			t.Errorf("overrides (-want +got):\n%s", diff)
		}
	})
}

func TestKind_DispatchIsActive(t *testing.T) {
	entity := overrides.Entity{
		ApplicationUniversalIdentifier: owner,
		Values:                         map[string]any{"isActive": true},
	}

	t.Run("custom caller on a foreign entity overrides", func(t *testing.T) {
		update, overridden := kind.DispatchIsActive(entity, false, custom, custom)
		if !overridden {
			t.Fatal("must override")
		}
		if diff := cmp.Diff(overrides.Authored{custom: {"isActive": false}}, update.Overrides); diff != "" {
			t.Errorf("overrides (-want +got):\n%s", diff)
		}
		if len(update.Column) != 0 {
			t.Errorf("column = %v, want empty", update.Column)
		}
	})

	t.Run("toggling back clears the override", func(t *testing.T) {
		withOverride := entity
		withOverride.Overrides = map[string]any{custom: map[string]any{"isActive": false}}
		update, _ := kind.DispatchIsActive(withOverride, true, custom, custom)
		if update.Overrides != nil {
			t.Errorf("overrides = %v, want nil", update.Overrides)
		}
	})

	t.Run("owner writes the column", func(t *testing.T) {
		update, overridden := kind.DispatchIsActive(entity, false, owner, custom)
		if overridden || update.Column["isActive"] != false {
			t.Errorf("got %v, %v", update, overridden)
		}
	})

	t.Run("custom entity writes the column unless engine-managed", func(t *testing.T) {
		customEntity := overrides.Entity{ApplicationUniversalIdentifier: custom}
		if _, overridden := kind.DispatchIsActive(customEntity, false, custom, custom); overridden {
			t.Error("custom caller on its own entity writes the column")
		}
		customEntity.IsSystemSideEffect = true
		if _, overridden := kind.DispatchIsActive(customEntity, false, custom, custom); !overridden {
			t.Error("engine-managed entity is overridden")
		}
	})
}

func TestKind_Reset(t *testing.T) {
	raw := map[string]any{
		owner:  map[string]any{"label": "Owner"},
		custom: map[string]any{"label": "Custom"},
	}
	if diff := cmp.Diff(overrides.Authored{owner: {"label": "Owner"}}, kind.Reset(raw, custom, custom)); diff != "" {
		t.Errorf("reset (-want +got):\n%s", diff)
	}
	if got := kind.Reset(map[string]any{"label": "Legacy"}, custom, custom); got != nil {
		t.Errorf("resetting the only (legacy) entry = %v, want nil", got)
	}
	if got := kind.Reset(nil, custom, custom); got != nil {
		t.Errorf("reset of nothing = %v, want nil", got)
	}
}

func TestTranslateStandardLabel(t *testing.T) {
	id := overrides.MessageID("Company", "")
	bundle := fakeTranslator{id: "Bundle"}
	tests := []struct {
		name     string
		source   string
		standard bool
		catalog  map[string]string
		want     string
	}{
		{"empty source", "", true, nil, ""},
		{"catalog wins over bundle", "Company", true, map[string]string{id: "Entreprise"}, "Entreprise"},
		{"catalog miss keeps source", "Company", false, map[string]string{}, "Company"},
		{"standard bundle", "Company", true, nil, "Bundle"},
		{"bundle miss keeps source", "Other", true, nil, "Other"},
		{"custom app without catalog", "Company", false, nil, "Company"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := overrides.TranslateStandardLabel(test.source, "", test.standard, test.catalog, bundle)
			if got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestKind_Resolve(t *testing.T) {
	labelID := overrides.MessageID("Create", "commandMenuItem.label")
	catalog := overrides.ApplicationCatalog{
		Locale:                    "fr-FR",
		Translator:                fakeTranslator{labelID: "Creer"},
		StandardApplicationID:     standard,
		CustomUniversalIdentifier: custom,
		UniversalIdentifierByID:   map[string]string{standard: owner, "custom-id": custom},
	}
	authored := map[string]any{
		custom: map[string]any{
			"label":        "Mine",
			"icon":         "IconMine",
			"translations": map[string]any{"fr-FR": map[string]any{"shortLabel": "Court"}},
		},
	}
	tests := []struct {
		name        string
		application string
		overrides   any
		base        string
		property    string
		want        string
	}{
		{"authored translation", "custom-id", authored, "Short", "shortLabel", "Court"},
		{"custom entity keeps base label", "custom-id", authored, "Base", "label", "Base"},
		{"standard entity takes the authored override", standard, authored, "Create", "label", "Mine"},
		{"non-translatable override is verbatim", standard, authored, "IconBase", "icon", "IconMine"},
		{"standard entity falls back to the bundle", standard, nil, "Create", "label", "Creer"},
		{"standard entity with no translation", standard, nil, "Delete", "label", "Delete"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := kind.Resolve(test.base, test.overrides, test.property, catalog.For(test.application))
			if got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}

	t.Run("empty locale falls back to the source locale", func(t *testing.T) {
		i18n := catalog.For("custom-id")
		i18n.Locale = ""
		raw := map[string]any{custom: map[string]any{"translations": map[string]any{"en": map[string]any{"label": "English"}}}}
		if got := kind.Resolve("Base", raw, "label", i18n); got != "English" {
			t.Errorf("got %q", got)
		}
	})
}

func TestKind_ResolveTranslatable(t *testing.T) {
	catalog := overrides.ApplicationCatalog{
		Translator:                fakeTranslator{overrides.MessageID("Create", "commandMenuItem.label"): "Creer"},
		StandardApplicationID:     standard,
		CustomUniversalIdentifier: custom,
		UniversalIdentifierByID:   map[string]string{standard: owner},
	}
	entity := map[string]any{"label": "Create", "shortLabel": nil, "overrides": nil}
	got := kind.ResolveTranslatable(entity, catalog.For(standard))
	if diff := cmp.Diff(map[string]string{"label": "Creer"}, got); diff != "" {
		t.Errorf("resolved (-want +got):\n%s", diff)
	}
}
