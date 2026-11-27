package files

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

const (
	routeFile         = "GET /file/{folder}/{id}"
	routeUpload       = "PUT /file-upload/{id}"
	routePublicAssets = "GET /public-assets/{workspaceId}/{applicationId}/{assetPath...}"
)

// Handler serves the file REST routes and sends every other request to next.
func (s *Service) Handler(next http.Handler, logger *slog.Logger) http.Handler {
	routes := &routes{service: s, logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc(routeFile, routes.serveByID)
	mux.HandleFunc(routeUpload, routes.receiveUpload)
	mux.HandleFunc(routePublicAssets, routes.servePublicAsset)
	mux.Handle("/", next)
	return mux
}

type routes struct {
	service *Service
	logger  *slog.Logger
}

func (r *routes) fail(w http.ResponseWriter, err error) {
	var fileErr *Error
	if errors.As(err, &fileErr) {
		http.Error(w, fileErr.Message, fileErr.httpStatus())
		return
	}
	r.logger.Error("serve file route", "err", err)
	http.Error(w, "Internal server error", http.StatusInternalServerError)
}

func (r *routes) verify(req *http.Request, wantType auth.TokenType, ignoreExpiry bool) (auth.FileClaims, bool, error) {
	token := req.URL.Query().Get("token")
	if token == "" {
		return auth.FileClaims{}, false, nil
	}
	claims, err := r.service.tokens.VerifyFileToken(req.Context(), token, wantType, ignoreExpiry)
	if errors.Is(err, auth.ErrInvalidFileToken) {
		return auth.FileClaims{}, false, nil
	}
	return claims, err == nil, err
}

func (r *routes) serveByID(w http.ResponseWriter, req *http.Request) {
	folder := Folder(req.PathValue("folder"))
	config, supported := folderConfigs[folder]
	if !supported || !config.servedByID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	claims, ok, err := r.verify(req, auth.TokenTypeFile, config.ignoreTokenExpiry)
	if err != nil {
		r.fail(w, err)
		return
	}
	if !ok || claims.FileID != req.PathValue("id") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	if folder != FolderCorePicture {
		status, err := r.service.store.activationStatus(req.Context(), claims.WorkspaceID)
		if err != nil {
			r.fail(w, err)
			return
		}
		if status == activationSuspend {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}
	served, err := r.service.openByID(req.Context(), claims.WorkspaceID, claims.FileID, folder)
	if err != nil {
		r.fail(w, err)
		return
	}
	r.write(w, req, served)
}

func (r *routes) servePublicAsset(w http.ResponseWriter, req *http.Request) {
	assetPath := req.PathValue("assetPath")
	if !validResourcePath(assetPath) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	served, err := r.service.openPublicAsset(req.Context(), req.PathValue("workspaceId"), req.PathValue("applicationId"), assetPath)
	if err != nil {
		r.fail(w, err)
		return
	}
	r.write(w, req, served)
}

func (r *routes) write(w http.ResponseWriter, req *http.Request, served servedFile) {
	defer func() {
		if err := served.Content.Close(); err != nil {
			r.logger.Warn("close served file", "err", err)
		}
	}()
	mimeType := served.MIMEType
	if mimeType == "" {
		mimeType = mimeOctetStream
	}
	header := w.Header()
	header.Set("Content-Type", mimeType)
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Content-Disposition", contentDisposition(mimeType))
	if served.CacheControl != "" {
		header.Set("Cache-Control", served.CacheControl)
	}
	if mimeType == mimeSVG {
		header.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	}
	http.ServeContent(w, req, "", time.Time{}, served.Content)
}

func (r *routes) receiveUpload(w http.ResponseWriter, req *http.Request) {
	claims, ok, err := r.verify(req, auth.TokenTypeFileUpload, false)
	if err != nil {
		r.fail(w, err)
		return
	}
	if !ok || claims.FileID != req.PathValue("id") || strings.TrimSpace(claims.WorkspaceID) == "" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	if err := r.service.receive(req.Context(), claims.WorkspaceID, claims.FileID, req.Body); err != nil {
		r.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
