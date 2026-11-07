package workspace

import (
	"math/big"
	"strings"
)

const PinnedWorkspaceID = "26a06a83-ad30-4547-9126-7f6339d43e03"

func SchemaName() string {
	id, ok := new(big.Int).SetString(strings.ReplaceAll(PinnedWorkspaceID, "-", ""), 16)
	if !ok {
		panic("PinnedWorkspaceID is not a UUID")
	}
	return "workspace_" + id.Text(36)
}
