package recordsgql_test

import (
	"slices"
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

func TestDynamic_ServesEveryRuntimeBuiltObject(t *testing.T) {
	t.Parallel()
	server := newDynamicServer(t, frontdoor.RuntimeBuiltObjects...)
	for _, singular := range frontdoor.RuntimeBuiltObjects {
		t.Run(singular, func(t *testing.T) {
			t.Parallel()
			object := model.Objects[slices.IndexFunc(model.Objects, func(candidate model.Object) bool { return candidate.NameSingular == singular })]
			plural := object.NamePlural
			query := `query FindMany` + strings.ToUpper(plural[:1]) + plural[1:] + ` { ` + plural + ` { edges { node { id __typename } } totalCount } }`
			connection := dataOf(t, call(t, server, query, nil))[plural].(map[string]any)
			if _, ok := connection["totalCount"].(float64); !ok {
				t.Errorf("%s = %v, want a connection with a totalCount", plural, connection)
			}
			if got := len(connection["edges"].([]any)); got != int(connection["totalCount"].(float64)) {
				t.Errorf("%s edges = %d, want totalCount %v", plural, got, connection["totalCount"])
			}
		})
	}
}
