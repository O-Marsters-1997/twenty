package files_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	accessstore "github.com/twentyhq/twenty/packages/twenty-server-go/internal/access/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/files"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/files/filesgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	workspaceID    = "26a06a83-ad30-4547-9126-7f6339d43e03"
	newWorkspaceID = "20202020-0000-4000-8000-000000000003"
	customAppID    = "ad2ef204-2bbe-4670-b093-6c8ad3c40ca7"
	customAppUID   = "ad2ef204-2bbe-4670-b093-6c8ad3c40ca7"
	fieldAppID     = "c2000000-0000-4000-8000-000000000002"
	fieldAppUID    = "c3000000-0000-4000-8000-000000000002"
	fieldID        = "f1000000-0000-4000-8000-000000000001"
	fieldUID       = "f2000000-0000-4000-8000-000000000001"
	adminUserWS    = "c1000000-0000-4000-8000-000000000001"
	uploaderUserWS = "c1000000-0000-4000-8000-000000000002"
	memberUserWS   = "c1000000-0000-4000-8000-000000000003"
	newUserID      = "b0000000-0000-4000-8000-000000000001"
	strangerID     = "b0000000-0000-4000-8000-000000000002"
	adminRoleID    = "d0000000-0000-4000-8000-000000000001"
	uploaderRoleID = "d0000000-0000-4000-8000-000000000002"
	memberRoleID   = "d0000000-0000-4000-8000-000000000003"
	serverURL      = "http://localhost:3000"
)

var (
	adminPrincipal    = auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: adminUserWS}
	uploaderPrincipal = auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: uploaderUserWS}
	memberPrincipal   = auth.Principal{UserID: "u", WorkspaceID: workspaceID, UserWorkspaceID: memberUserWS}
	creatorPrincipal  = auth.Principal{UserID: newUserID}
)

var pngBytes = append([]byte("\x89PNG\r\n\x1a\n"), bytes.Repeat([]byte{0}, 24)...)

type fakeTokens struct{}

func (fakeTokens) IssueFileToken(_ context.Context, workspace, file string, _ time.Duration) (string, error) {
	return "FILE." + workspace + "." + file, nil
}

func (fakeTokens) IssueUploadToken(_ context.Context, workspace, file string, _ time.Duration) (string, error) {
	return "FILE_UPLOAD." + workspace + "." + file, nil
}

func (fakeTokens) VerifyFileToken(_ context.Context, token string, wantType auth.TokenType, _ bool) (auth.FileClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != string(wantType) {
		return auth.FileClaims{}, auth.ErrInvalidFileToken
	}
	return auth.FileClaims{WorkspaceID: parts[1], FileID: parts[2]}, nil
}

type harness struct {
	pool    *pgxpool.Pool
	root    string
	service *files.Service
	logger  *slog.Logger
}

func newHarness(t *testing.T) harness {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	statements := []string{
		`SET LOCAL session_replication_role = replica`,
		workspaceRow(newWorkspaceID, "fresh", "c2000000-0000-4000-8000-000000000009", "PENDING_CREATION"),
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('` + fieldAppID + `', '` + fieldAppUID + `', 'Fields', '` + workspaceID + `')`,
		`INSERT INTO core.application (id, "universalIdentifier", name, "workspaceId") VALUES ('c2000000-0000-4000-8000-000000000009', 'c3000000-0000-4000-8000-000000000009', 'Fresh', '` + newWorkspaceID + `')`,
		`INSERT INTO core."fieldMetadata" (id, "objectMetadataId", type, name, label, "workspaceId", "universalIdentifier", "applicationId") VALUES ('` + fieldID + `', gen_random_uuid(), 'FILES', 'attachments', 'Attachments', '` + workspaceID + `', '` + fieldUID + `', '` + fieldAppID + `')`,
		role(adminRoleID, "File Admin", true),
		role(uploaderRoleID, "File Uploader", false),
		role(memberRoleID, "File Member", false),
		`INSERT INTO core."rolePermissionFlag" ("roleId", "workspaceId", "universalIdentifier", "applicationId", "permissionFlagId") VALUES ('` + uploaderRoleID + `', '` + workspaceID + `', gen_random_uuid(), '` + customAppID + `', (SELECT id FROM core."permissionFlag" WHERE key = 'UPLOAD_FILE' AND "workspaceId" = '` + workspaceID + `'))`,
		roleTarget(adminRoleID, adminUserWS),
		roleTarget(uploaderRoleID, uploaderUserWS),
		roleTarget(memberRoleID, memberUserWS),
		`INSERT INTO core."userWorkspace" (id, "userId", "workspaceId") VALUES (gen_random_uuid(), '` + newUserID + `', '` + newWorkspaceID + `')`,
	}
	tx, err := pool.Begin(t.Context())
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	for _, statement := range statements {
		if _, err := tx.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	if err := tx.Commit(t.Context()); err != nil {
		t.Fatalf("commit: %v", err)
	}
	root := t.TempDir()
	return harness{
		pool: pool,
		root: root,
		service: files.NewService(pool, fakeTokens{}, accessstore.NewPermissions(pool).Has, files.Config{
			ServerURL: serverURL, StorageRoot: root, FileTokenTTL: time.Hour, UploadTTL: time.Hour,
		}),
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func workspaceRow(id, subdomain, applicationID, status string) string {
	return `INSERT INTO core.workspace (id, subdomain, "workspaceCustomApplicationId", "defaultRoleId", "databaseSchema", "activationStatus") VALUES ('` +
		id + `', '` + subdomain + `', '` + applicationID + `', '` + adminRoleID + `', 'workspace_` + subdomain + `', '` + status + `')`
}

func role(id, label string, canUpdateAllSettings bool) string {
	return fmt.Sprintf(`INSERT INTO core.role (id, label, "canUpdateAllSettings", "workspaceId", "universalIdentifier", "applicationId") VALUES ('%s', '%s', %t, '%s', gen_random_uuid(), '%s')`,
		id, label, canUpdateAllSettings, workspaceID, customAppID)
}

func roleTarget(roleID, userWorkspaceID string) string {
	return `INSERT INTO core."roleTarget" ("workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId") VALUES ('` + workspaceID + `', '` + roleID + `', '` + userWorkspaceID + `', gen_random_uuid(), '` + customAppID + `')`
}

func (h harness) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := h.pool.Exec(t.Context(), sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

func (h harness) seedPending(t *testing.T, workspace, appUID, id, folder, name string, declaredSize int, content []byte) {
	t.Helper()
	h.exec(t, `INSERT INTO core.file (id, size, "workspaceId", "applicationId", path, "mimeType", status, settings, "createdAt")
		SELECT $1::uuid, $2, $3::uuid, a.id, $4, 'application/octet-stream', 'PENDING', '{"isTemporaryFile": true, "toDelete": false}'::jsonb, '2026-01-02T03:04:05Z'
		FROM core.application a WHERE a."universalIdentifier" = $5::uuid`,
		id, declaredSize, workspace, folder+"/"+name, appUID)
	if content != nil {
		h.putObject(t, workspace, appUID, folder, ".pending/"+id+"/"+name, content)
	}
}

func (h harness) putObject(t *testing.T, workspace, appUID, folder, resourcePath string, content []byte) {
	t.Helper()
	target := filepath.Join(h.root, workspace, appUID, folder, resourcePath)
	if err := os.MkdirAll(filepath.Dir(target), 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(target, content, 0o600); err != nil {
		t.Fatal(err)
	}
}

func (h harness) objectExists(workspace, appUID, folder, resourcePath string) bool {
	_, err := os.Stat(filepath.Join(h.root, workspace, appUID, folder, resourcePath))
	return err == nil
}

func (h harness) graphql(principal auth.Principal) http.Handler {
	graphql := filesgql.NewHandler(&filesgql.Resolver{Files: h.service}, h.logger)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		graphql.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func (h harness) rest() http.Handler {
	return h.service.Handler(http.NotFoundHandler(), h.logger)
}

func send(t *testing.T, handler http.Handler, query string, variables map[string]any) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/metadata", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode %s: %v", recorder.Body.String(), err)
	}
	return decoded
}

func errorExtensions(decoded map[string]any) map[string]any {
	errs, ok := decoded["errors"].([]any)
	if !ok {
		return nil
	}
	extensions, _ := errs[0].(map[string]any)["extensions"].(map[string]any)
	return extensions
}

func do(handler http.Handler, method, target string, body io.Reader, headers ...string) *httptest.ResponseRecorder {
	request := httptest.NewRequestWithContext(context.Background(), method, target, body)
	for i := 0; i+1 < len(headers); i += 2 {
		request.Header.Set(headers[i], headers[i+1])
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}
