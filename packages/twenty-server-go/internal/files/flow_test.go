package files_test

import (
	"bytes"
	"net/http"
	"strings"
	"testing"
)

const (
	createQuery   = `mutation($filename: String!, $size: Float!, $folder: FileFolder!, $field: String) { createFileUpload(filename: $filename, size: $size, fileFolder: $folder, fieldMetadataId: $field) { fileId uploadUrl contentType } }`
	completeQuery = `mutation($id: String!) { completeFileUpload(fileId: $id) { id path size url } }`
	logoQuery     = `mutation($id: String!) { completeWorkspaceLogoUpload(fileId: $id) { id url } }`
)

func uploadTarget(t *testing.T, h harness, folder, filename string, size int, field string) (id, uploadPath string) {
	t.Helper()
	vars := map[string]any{"filename": filename, "size": size, "folder": folder}
	if field != "" {
		vars["field"] = field
	}
	got := send(t, h.graphql(adminPrincipal), createQuery, vars)
	if got["errors"] != nil {
		t.Fatalf("createFileUpload errors = %v", got["errors"])
	}
	target := got["data"].(map[string]any)["createFileUpload"].(map[string]any)
	return target["fileId"].(string), strings.TrimPrefix(target["uploadUrl"].(string), serverURL)
}

func TestUploadFlow_RoundTripsThroughRestRoutes(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	id, uploadPath := uploadTarget(t, h, "FilesField", "notes.txt", 11, fieldID)

	if got := do(h.rest(), http.MethodPut, uploadPath, strings.NewReader("hello world")); got.Code != http.StatusNoContent {
		t.Fatalf("PUT status = %d, want 204: %s", got.Code, got.Body)
	}
	completed := send(t, h.graphql(adminPrincipal), completeQuery, map[string]any{"id": id})
	if completed["errors"] != nil {
		t.Fatalf("completeFileUpload errors = %v", completed["errors"])
	}
	signed := completed["data"].(map[string]any)["completeFileUpload"].(map[string]any)
	if want := "files-field/" + fieldUID + "/" + id; !strings.HasPrefix(signed["path"].(string), want) {
		t.Errorf("path = %v, want prefix %s", signed["path"], want)
	}
	if !h.objectExists(workspaceID, fieldAppUID, "files-field", fieldUID+"/"+id+".txt") {
		t.Error("completed object missing from its final location")
	}
	if got := do(h.rest(), http.MethodPut, uploadPath, strings.NewReader("again")); got.Code != http.StatusBadRequest {
		t.Errorf("PUT after completion status = %d, want 400", got.Code)
	}

	fileURL := strings.TrimPrefix(signed["url"].(string), serverURL)
	got := do(h.rest(), http.MethodGet, fileURL, nil)
	if got.Code != http.StatusOK || got.Body.String() != "hello world" {
		t.Fatalf("GET = %d %q, want 200 hello world", got.Code, got.Body)
	}
	if got.Header().Get("X-Content-Type-Options") != "nosniff" || got.Header().Get("Content-Type") != "text/plain; charset=utf-8" && !strings.HasPrefix(got.Header().Get("Content-Type"), "text/plain") {
		t.Errorf("headers = %v, want nosniff and text/plain", got.Header())
	}
	ranged := do(h.rest(), http.MethodGet, fileURL, nil, "Range", "bytes=6-")
	if ranged.Code != http.StatusPartialContent || ranged.Body.String() != "world" {
		t.Errorf("ranged GET = %d %q, want 206 world", ranged.Code, ranged.Body)
	}
}

func TestFileRoute_RejectsBadTokens(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const other = "a1000000-0000-4000-8000-0000000000ff"
	for name, target := range map[string]string{
		"no token":           "/file/core-picture/" + other,
		"token for other id": "/file/core-picture/" + other + "?token=FILE." + workspaceID + ".someone-else",
		"upload token":       "/file/core-picture/" + other + "?token=FILE_UPLOAD." + workspaceID + "." + other,
		"unservable folder":  "/file/source/" + other + "?token=FILE." + workspaceID + "." + other,
		"unknown file":       "/file/core-picture/" + other + "?token=FILE." + workspaceID + "." + other,
	} {
		want := http.StatusForbidden
		if name == "unknown file" {
			want = http.StatusNotFound
		}
		if got := do(h.rest(), http.MethodGet, target, nil); got.Code != want {
			t.Errorf("%s: status = %d, want %d", name, got.Code, want)
		}
	}
}

func TestUpload_RejectsOversizedBody(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	id, uploadPath := uploadTarget(t, h, "Workflow", "a.txt", 4, "")
	if got := do(h.rest(), http.MethodPut, uploadPath, strings.NewReader("12345")); got.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("oversized PUT = %d, want 413", got.Code)
	}
	if got := do(h.rest(), http.MethodPut, uploadPath, strings.NewReader("123")); got.Code != http.StatusBadRequest {
		t.Errorf("short PUT = %d, want 400", got.Code)
	}
	got := send(t, h.graphql(adminPrincipal), completeQuery, map[string]any{"id": id})
	if ext := errorExtensions(got); ext["subCode"] != "FILE_NOT_UPLOADED" {
		t.Errorf("complete without a stored object extensions = %v, want FILE_NOT_UPLOADED", ext)
	}
}

func TestCompleteFileUpload_Refusals(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000011", "workflow", "a1000000-0000-4000-8000-000000000011.txt", 9, []byte("hello\n"))
	h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000012", "core-picture", "a1000000-0000-4000-8000-000000000012.png", 32, bytes.Repeat([]byte("x"), 32))
	h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000013", "core-picture", "a1000000-0000-4000-8000-000000000013.txt", 6, []byte("hello\n"))
	h.seedPending(t, workspaceID, customAppUID, "a1000000-0000-4000-8000-000000000014", "core-picture", "a1000000-0000-4000-8000-000000000014.png", 32, pngBytes)
	tests := []struct {
		name, query, id, subCode string
	}{
		{"size mismatch", completeQuery, "a1000000-0000-4000-8000-000000000011", "FILE_SIZE_MISMATCH"},
		{"picture completed by the generic mutation", completeQuery, "a1000000-0000-4000-8000-000000000014", "BAD_REQUEST"},
		{"content does not match extension", logoQuery, "a1000000-0000-4000-8000-000000000012", "BAD_REQUEST"},
		{"mime not allowed in folder", logoQuery, "a1000000-0000-4000-8000-000000000013", "BAD_REQUEST"},
		{"unknown file", completeQuery, "a1000000-0000-4000-8000-0000000000aa", "FILE_NOT_FOUND"},
		{"not a uuid", completeQuery, "nope", "FILE_NOT_FOUND"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := send(t, h.graphql(adminPrincipal), tt.query, map[string]any{"id": tt.id})
			if ext := errorExtensions(got); ext["subCode"] != tt.subCode {
				t.Errorf("extensions = %v, want subCode %s", ext, tt.subCode)
			}
		})
	}
}

func TestCreateFileUpload_Refusals(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	tests := []struct {
		name      string
		principal func() map[string]any
		code      string
		subCode   string
	}{
		{"member lacks the upload flag", func() map[string]any {
			return send(t, h.graphql(memberPrincipal), createQuery, map[string]any{"filename": "a.txt", "size": 5, "folder": "Workflow"})
		}, "FORBIDDEN", "PERMISSION_DENIED"},
		{"folder without direct upload", func() map[string]any {
			return send(t, h.graphql(adminPrincipal), createQuery, map[string]any{"filename": "a.gz", "size": 5, "folder": "AppTarball"})
		}, "BAD_USER_INPUT", "BAD_REQUEST"},
		{"picture above 10MB", func() map[string]any {
			return send(t, h.graphql(adminPrincipal), createQuery, map[string]any{"filename": "a.png", "size": 11 << 20, "folder": "CorePicture"})
		}, "BAD_USER_INPUT", "FILE_TOO_LARGE"},
		{"fractional size", func() map[string]any {
			return send(t, h.graphql(adminPrincipal), createQuery, map[string]any{"filename": "a.png", "size": 1.5, "folder": "CorePicture"})
		}, "BAD_USER_INPUT", "FILE_TOO_LARGE"},
		{"files field without a field", func() map[string]any {
			return send(t, h.graphql(adminPrincipal), createQuery, map[string]any{"filename": "a.txt", "size": 5, "folder": "FilesField"})
		}, "BAD_USER_INPUT", "BAD_REQUEST"},
		{"filename without extension", func() map[string]any {
			return send(t, h.graphql(adminPrincipal), createQuery, map[string]any{"filename": "README", "size": 5, "folder": "Workflow"})
		}, "BAD_USER_INPUT", "BAD_REQUEST"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ext := errorExtensions(tt.principal())
			if ext["code"] != tt.code || ext["subCode"] != tt.subCode {
				t.Errorf("extensions = %v, want %s/%s", ext, tt.code, tt.subCode)
			}
		})
	}
}

func TestCreateNewWorkspaceLogoUpload_OnlyForPendingWorkspaceMembers(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const query = `mutation($w: String!) { createNewWorkspaceLogoUpload(workspaceId: $w, filename: "a.png", size: 5) { fileId } }`
	for name, principal := range map[string]string{"stranger": strangerID, "activated workspace": newUserID} {
		workspace := newWorkspaceID
		if name == "activated workspace" {
			workspace = workspaceID
		}
		p := creatorPrincipal
		p.UserID = principal
		got := send(t, h.graphql(p), query, map[string]any{"w": workspace})
		if ext := errorExtensions(got); ext["code"] != "FORBIDDEN" {
			t.Errorf("%s: extensions = %v, want FORBIDDEN", name, ext)
		}
	}
}

func TestWorkspaceLogo_ReplacementDeletesThePreviousPicture(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	const first, second = "a1000000-0000-4000-8000-000000000021", "a1000000-0000-4000-8000-000000000022"
	for _, id := range []string{first, second} {
		h.seedPending(t, workspaceID, customAppUID, id, "core-picture", id+".png", 32, pngBytes)
		if got := send(t, h.graphql(adminPrincipal), logoQuery, map[string]any{"id": id}); got["errors"] != nil {
			t.Fatalf("complete %s errors = %v", id, got["errors"])
		}
	}
	if h.objectExists(workspaceID, customAppUID, "core-picture", first+".png") {
		t.Error("replaced logo still in storage")
	}
	if !h.objectExists(workspaceID, customAppUID, "core-picture", second+".png") {
		t.Error("current logo missing from storage")
	}
	var logo string
	if err := h.pool.QueryRow(t.Context(), `SELECT "logoFileId"::text FROM core.workspace WHERE id = $1`, workspaceID).Scan(&logo); err != nil || logo != second {
		t.Errorf("logoFileId = %q, %v; want %s", logo, err, second)
	}
	if got := send(t, h.graphql(adminPrincipal), logoQuery, map[string]any{"id": second}); got["errors"] != nil {
		t.Errorf("re-completing the current logo errors = %v, want none", got["errors"])
	}
}

func TestPublicAssets_ServeOnlyUploadedAssetPaths(t *testing.T) {
	t.Parallel()
	h := newHarness(t)
	h.exec(t, `INSERT INTO core.file (id, size, "workspaceId", "applicationId", path, "mimeType", status) VALUES ('a1000000-0000-4000-8000-000000000031', 3, $1, $2, 'public-asset/logo.png', 'image/png', 'UPLOADED')`, workspaceID, customAppID)
	h.putObject(t, workspaceID, customAppUID, "public-asset", "logo.png", []byte("png"))
	base := "/public-assets/" + workspaceID + "/" + customAppID + "/"
	if got := do(h.rest(), http.MethodGet, base+"logo.png", nil); got.Code != http.StatusOK || got.Body.String() != "png" {
		t.Errorf("GET asset = %d %q, want 200 png", got.Code, got.Body)
	}
	for _, target := range []string{base + "missing.png", base + "noextension"} {
		if got := do(h.rest(), http.MethodGet, target, nil); got.Code != http.StatusNotFound {
			t.Errorf("GET %s = %d, want 404", target, got.Code)
		}
	}
}
