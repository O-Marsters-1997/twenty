package workspace_test

import (
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

func TestSchemaName(t *testing.T) {
	t.Parallel()
	const want = "workspace_2abogkkt2zd45pa9aun09djpf"

	if got := workspace.SchemaName(); got != want {
		t.Errorf("SchemaName() = %q, want %q", got, want)
	}
}
