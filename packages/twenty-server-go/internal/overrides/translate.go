package overrides

import (
	"crypto/sha256"
	"encoding/base64"
	"slices"
)

const (
	sourceLocale  = "en"
	unitSeparator = "\x1f"
)

type Translator interface {
	Translate(messageID string, values map[string]string) string
}

func MessageID(message, context string) string {
	sum := sha256.Sum256([]byte(message + unitSeparator + context))
	return base64.StdEncoding.EncodeToString(sum[:])[:6]
}

var placeholderPassThrough = map[string]string{
	"objectLabel":         "{objectLabel}",
	"objectLabelSingular": "{objectLabelSingular}",
	"objectLabelPlural":   "{objectLabelPlural}",
	"objectIcon":          "{objectIcon}",
}

func TranslateStandardLabel(source, context string, isStandardApp bool, catalog map[string]string, translator Translator) string {
	if source == "" || (catalog == nil && !isStandardApp) {
		return source
	}
	messageID := MessageID(source, context)
	if catalog != nil {
		if translated, ok := catalog[messageID]; ok {
			return translated
		}
		return source
	}
	if translated := translator.Translate(messageID, placeholderPassThrough); translated != messageID {
		return translated
	}
	return source
}

type I18nContext struct {
	Locale        string
	Translator    Translator
	IsStandardApp bool
	Catalog       map[string]string
	Authors       Authors
}

type ApplicationCatalog struct {
	Locale                    string
	Translator                Translator
	StandardApplicationID     string
	CustomUniversalIdentifier string
	UniversalIdentifierByID   map[string]string
}

func (catalog ApplicationCatalog) For(applicationID string) I18nContext {
	return I18nContext{
		Locale:        catalog.Locale,
		Translator:    catalog.Translator,
		IsStandardApp: applicationID != "" && applicationID == catalog.StandardApplicationID,
		Authors: Authors{
			Custom: catalog.CustomUniversalIdentifier,
			Owner:  catalog.UniversalIdentifierByID[applicationID],
		},
	}
}

func (kind Kind) ReadTranslation(raw any, locale, property string, authors Authors) (string, bool) {
	value, ok := kind.ReadProperty(raw, []string{"translations", locale, property}, authors)
	text, isString := value.(string)
	return text, ok && isString
}

func (kind Kind) Resolve(base string, overrides any, property string, i18n I18nContext) string {
	isTranslatable := slices.Contains(kind.Translatable, property)
	override, hasOverride := kind.ReadProperty(overrides, []string{property}, i18n.Authors)
	locale := i18n.Locale
	if locale == "" {
		locale = sourceLocale
	}

	if isTranslatable {
		if translation, ok := kind.ReadTranslation(overrides, locale, property, i18n.Authors); ok {
			return translation
		}
	}
	if !i18n.IsStandardApp && i18n.Catalog == nil {
		return base
	}
	if !isTranslatable && hasOverride && override != nil {
		text, _ := override.(string)
		return text
	}
	if text, ok := override.(string); ok && text != "" {
		return text
	}
	return TranslateStandardLabel(base, kind.Name+"."+property, i18n.IsStandardApp, i18n.Catalog, i18n.Translator)
}

func (kind Kind) ResolveTranslatable(entity map[string]any, i18n I18nContext) map[string]string {
	resolved := map[string]string{}
	for _, property := range kind.Translatable {
		if base, ok := entity[property].(string); ok {
			resolved[property] = kind.Resolve(base, entity["overrides"], property, i18n)
		}
	}
	return resolved
}
