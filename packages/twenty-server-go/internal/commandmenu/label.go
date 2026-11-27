package commandmenu

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/overrides"
)

var placeholder = regexp.MustCompile(`\{(\w+)\}`)

type identityTranslator struct{}

func (identityTranslator) Translate(messageID string, _ map[string]string) string { return messageID }

func capitalize(text string) string {
	first, size := utf8.DecodeRuneInString(text)
	if size == 0 {
		return text
	}
	return string(unicode.ToUpper(first)) + text[size:]
}

func interpolate(message string, values map[string]string) string {
	return placeholder.ReplaceAllStringFunc(message, func(match string) string {
		if value, ok := values[strings.Trim(match, "{}")]; ok {
			return value
		}
		return match
	})
}

type navigationTarget struct {
	LabelPlural   string
	Icon          string
	ApplicationID string
	Overrides     any
}

func interpolateNavigation(resolved *string, target *navigationTarget, i18n overrides.I18nContext) *string {
	if target == nil || resolved == nil {
		return nil
	}
	labelPlural := overrides.ObjectMetadata.Resolve(target.LabelPlural, target.Overrides, "labelPlural", i18n)
	icon := overrides.ObjectMetadata.Resolve(target.Icon, target.Overrides, "icon", i18n)
	text := interpolate(*resolved, map[string]string{"objectLabelPlural": capitalize(labelPlural), "objectIcon": icon})
	return &text
}
