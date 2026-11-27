package files_test

import (
	"bytes"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

const (
	freshAppUID = "c3000000-0000-4000-8000-000000000009"
	goldenDir   = "filesgql/testdata"
)

func TestOperations_MatchNodeGolden(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		principal auth.Principal
		seed      func(*testing.T, harness)
		ignore    []string
	}{
		{
			name: "CreateFileUpload", principal: adminPrincipal,
			ignore: []string{"data.createFileUpload.fileId", "data.createFileUpload.uploadUrl", "data.createFileUpload.expiresAt"},
		},
		{
			name: "CompleteFileUpload", principal: adminPrincipal,
			seed: func(t *testing.T, h harness) {
				h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000001", "workflow", "a1000000-0000-4000-8000-000000000001.txt", 6, []byte("hello\n"))
			},
		},
		{
			name: "CreateNewWorkspaceLogoUpload", principal: creatorPrincipal,
			ignore: []string{"data.createNewWorkspaceLogoUpload.fileId", "data.createNewWorkspaceLogoUpload.uploadUrl", "data.createNewWorkspaceLogoUpload.expiresAt"},
		},
		{
			name: "CompleteNewWorkspaceLogoUpload", principal: creatorPrincipal,
			seed: func(t *testing.T, h harness) {
				h.seedPending(t, newWorkspaceID, freshAppUID, "a1000000-0000-4000-8000-000000000002", "core-picture", "a1000000-0000-4000-8000-000000000002.png", 32, pngBytes)
			},
		},
		{
			name: "CompleteWorkspaceLogoUpload", principal: adminPrincipal,
			seed: func(t *testing.T, h harness) {
				h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000003", "core-picture", "a1000000-0000-4000-8000-000000000003.png", 32, pngBytes)
			},
		},
		{
			name: "CompleteWorkspaceMemberProfilePictureUpload", principal: adminPrincipal,
			seed: func(t *testing.T, h harness) {
				h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000004", "core-picture", "a1000000-0000-4000-8000-000000000004.png", 32, pngBytes)
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			h := newHarness(t)
			if tt.seed != nil {
				tt.seed(t, h)
			}
			golden.Assert(t, h.graphql(tt.principal), goldenDir, tt.name, tt.ignore...)
		})
	}
}

func TestPngFixture_IsSizedForTheGoldenFiles(t *testing.T) {
	t.Parallel()
	if got := len(bytes.Clone(pngBytes)); got != 32 {
		t.Fatalf("len(pngBytes) = %d, want 32", got)
	}
}
