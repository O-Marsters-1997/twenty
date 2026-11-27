package files

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

const (
	flagUploadFile         = "UPLOAD_FILE"
	flagWorkspace          = "WORKSPACE"
	flagWorkspaceMembers   = "WORKSPACE_MEMBERS"
	flagProfileInformation = "PROFILE_INFORMATION"

	maxCorePictureBytes  = 10 << 20
	maxDirectUploadBytes = 1 << 30
	maxSVGBytes          = 3 << 20
	pendingFolder        = ".pending"
)

type Tokens interface {
	IssueFileToken(ctx context.Context, workspaceID, fileID string, ttl time.Duration) (string, error)
	IssueUploadToken(ctx context.Context, workspaceID, fileID string, ttl time.Duration) (string, error)
	VerifyFileToken(ctx context.Context, token string, wantType auth.TokenType, ignoreExpiry bool) (auth.FileClaims, error)
}

type Config struct {
	ServerURL    string
	StorageRoot  string
	FileTokenTTL time.Duration
	UploadTTL    time.Duration
}

type Service struct {
	store         store
	storage       localStorage
	tokens        Tokens
	hasPermission func(ctx context.Context, principal auth.Principal, flag string) (bool, error)
	config        Config
}

func NewService(pool *pgxpool.Pool, tokens Tokens, hasPermission func(context.Context, auth.Principal, string) (bool, error), config Config) *Service {
	return &Service{
		store:         store{pool: pool},
		storage:       localStorage{root: config.StorageRoot},
		tokens:        tokens,
		hasPermission: hasPermission,
		config:        config,
	}
}

type UploadTarget struct {
	FileID      string
	UploadURL   string
	ContentType string
	ExpiresAt   metadata.Timestamp
}

type SignedFile struct {
	ID        string
	Path      string
	Size      float64
	CreatedAt metadata.Timestamp
	URL       string
}

type CreateUploadInput struct {
	Filename         string
	Size             float64
	Folder           Folder
	FieldMetadataID  string
	FieldMetadataUID string
}

func workspaceOf(principal auth.Principal) (string, error) {
	if principal.WorkspaceID == "" {
		return "", auth.ErrUnauthenticated
	}
	return principal.WorkspaceID, nil
}

func (s *Service) authorize(ctx context.Context, principal auth.Principal, friendly string, flags ...string) error {
	for _, flag := range flags {
		allowed, err := s.hasPermission(ctx, principal, flag)
		if err != nil {
			return err
		}
		if allowed {
			return nil
		}
	}
	return permissionDenied(friendly)
}

func (s *Service) isCreating(ctx context.Context, workspaceID string) (bool, error) {
	status, err := s.store.activationStatus(ctx, workspaceID)
	return status == activationPending || status == activationOngoing, err
}

func (s *Service) CreateUpload(ctx context.Context, principal auth.Principal, input CreateUploadInput) (UploadTarget, error) {
	workspaceID, err := workspaceOf(principal)
	if err != nil {
		return UploadTarget{}, err
	}
	creating, err := s.isCreating(ctx, workspaceID)
	if err != nil {
		return UploadTarget{}, err
	}
	if !creating {
		flags := []string{flagUploadFile}
		if input.Folder == FolderCorePicture {
			flags = append(flags, flagWorkspace, flagWorkspaceMembers, flagProfileInformation)
		}
		const denied = "You do not have permission to access this feature. Please contact your workspace administrator for access."
		if err := s.authorize(ctx, principal, denied, flags...); err != nil {
			return UploadTarget{}, err
		}
	}
	return s.createUpload(ctx, workspaceID, input)
}

func (s *Service) CreateNewWorkspaceLogoUpload(ctx context.Context, principal auth.Principal, workspaceID, filename string, size float64) (UploadTarget, error) {
	if err := s.assertPendingWorkspace(ctx, principal, workspaceID); err != nil {
		return UploadTarget{}, err
	}
	return s.createUpload(ctx, workspaceID, CreateUploadInput{Filename: filename, Size: size, Folder: FolderCorePicture})
}

func (s *Service) assertPendingWorkspace(ctx context.Context, principal auth.Principal, workspaceID string) error {
	if principal.UserID == "" {
		return auth.ErrUnauthenticated
	}
	allowed, err := s.store.isPendingWorkspaceMember(ctx, principal.UserID, workspaceID)
	if err != nil {
		return err
	}
	if !allowed {
		return &Error{Code: CodeForbidden, SubCode: "FORBIDDEN_EXCEPTION", Message: "Cannot set a logo for this workspace", Friendly: "Cannot set a logo for this workspace"}
	}
	return nil
}

func (s *Service) createUpload(ctx context.Context, workspaceID string, input CreateUploadInput) (UploadTarget, error) {
	if !folderConfigs[input.Folder].directUpload {
		return UploadTarget{}, badRequest(fmt.Sprintf("Direct upload is not supported for file folder %s", input.Folder), "Direct upload is not supported for this file type.")
	}
	maxSize := float64(maxDirectUploadBytes)
	if input.Folder == FolderCorePicture {
		maxSize = maxCorePictureBytes
	}
	if input.Size != math.Trunc(input.Size) || input.Size <= 0 || input.Size > maxSize {
		return UploadTarget{}, tooLarge(fmt.Sprintf("Invalid file size %v (max %v bytes)", input.Size, maxSize), "The file is empty or exceeds the maximum allowed size.")
	}
	size := int64(input.Size)
	ext := extension(input.Filename)
	if strings.EqualFold(ext, "svg") && size > maxSVGBytes {
		return UploadTarget{}, tooLarge("SVG files above 3MB are not accepted", "SVG files above 3MB cannot be uploaded.")
	}

	fileID := uuid.NewString()
	name := fileID
	if ext != "" {
		name += "." + ext
	}
	location, err := s.uploadLocation(ctx, workspaceID, input)
	if err != nil {
		return UploadTarget{}, err
	}
	resourcePath := path.Join(location.ResourcePrefix, name)
	if !validResourcePath(resourcePath) || !validResourcePath(pendingResourcePath(fileID, resourcePath)) {
		return UploadTarget{}, badRequest(fmt.Sprintf("Resource path %q is not a valid storage path", resourcePath), "This file name is not supported.")
	}
	if err := s.store.insertPending(ctx, workspaceID, location.ApplicationID, fileID, string(input.Folder)+"/"+resourcePath, size); err != nil {
		return UploadTarget{}, err
	}

	token, err := s.tokens.IssueUploadToken(ctx, workspaceID, fileID, s.config.UploadTTL)
	if err != nil {
		return UploadTarget{}, err
	}
	return UploadTarget{
		FileID:      fileID,
		UploadURL:   fmt.Sprintf("%s/file-upload/%s?token=%s", s.config.ServerURL, fileID, token),
		ContentType: mimeOctetStream,
		ExpiresAt:   metadata.Timestamp{Time: time.Now().Add(s.config.UploadTTL)},
	}, nil
}

func (s *Service) uploadLocation(ctx context.Context, workspaceID string, input CreateUploadInput) (uploadLocation, error) {
	if input.Folder == FolderFilesField {
		if input.FieldMetadataID == "" && input.FieldMetadataUID == "" {
			return uploadLocation{}, badRequest("fieldMetadataId or fieldMetadataUniversalIdentifier must be provided", "fieldMetadataId or fieldMetadataUniversalIdentifier must be provided")
		}
		return s.store.fieldApplication(ctx, workspaceID, input.FieldMetadataID, input.FieldMetadataUID)
	}
	location, _, err := s.store.customApplication(ctx, workspaceID)
	return location, err
}

func pendingResourcePath(fileID, resourcePath string) string {
	return pendingFolder + "/" + fileID + "/" + resourcePath
}

func objectKey(workspaceID, applicationUID string, folder Folder, resourcePath string) string {
	return path.Join(workspaceID, applicationUID, string(folder), resourcePath)
}

func splitPath(filePath string) (Folder, string) {
	folder, resourcePath, _ := strings.Cut(filePath, "/")
	return Folder(folder), resourcePath
}

func (s *Service) lookup(ctx context.Context, workspaceID, fileID string, folder Folder) (file, error) {
	prefix := ""
	if folder != "" {
		prefix = string(folder) + "/"
	}
	found, err := s.store.file(ctx, workspaceID, fileID, prefix)
	if errors.Is(err, errFileMissing) {
		return file{}, notFound("File not found: " + fileID)
	}
	return found, err
}

func (s *Service) Complete(ctx context.Context, principal auth.Principal, fileID string) (SignedFile, error) {
	workspaceID, err := workspaceOf(principal)
	if err != nil {
		return SignedFile{}, err
	}
	if err := s.authorize(ctx, principal, "You do not have permission to access this feature. Please contact your workspace administrator for access.", flagUploadFile); err != nil {
		return SignedFile{}, err
	}
	return s.complete(ctx, workspaceID, fileID, "")
}

func (s *Service) complete(ctx context.Context, workspaceID, fileID string, dedicated Folder) (SignedFile, error) {
	found, err := s.lookup(ctx, workspaceID, fileID, "")
	if err != nil {
		return SignedFile{}, err
	}
	folder, resourcePath := splitPath(found.Path)
	switch {
	case !folderConfigs[folder].directUpload:
		return SignedFile{}, notFound("File not found: " + fileID)
	case folder == FolderCorePicture && dedicated != FolderCorePicture:
		return SignedFile{}, badRequest(fmt.Sprintf("File %s in folder %s is completed by its dedicated mutation", fileID, folder), "This file must be completed with its dedicated mutation.")
	case found.Status == statusUploaded && !found.IsTemporary:
		return SignedFile{}, badRequest(fmt.Sprintf("File %s is not awaiting an upload confirmation", fileID), "This file upload has already been finalized.")
	case found.Status == statusUploaded:
		return s.signed(ctx, workspaceID, found, folder)
	}

	pendingKey := objectKey(workspaceID, found.ApplicationUID, folder, pendingResourcePath(found.ID, resourcePath))
	stored, err := s.storage.size(pendingKey)
	switch {
	case errors.Is(err, errObjectNotFound):
		return SignedFile{}, notUploaded(found.Path)
	case err != nil:
		return SignedFile{}, err
	case stored != found.Size:
		return SignedFile{}, sizeMismatch(fmt.Sprintf("File %q has %d bytes in storage but %d were declared.", found.Path, stored, found.Size))
	}
	prefix, err := s.storage.readPrefix(pendingKey, sniffBytes)
	if err != nil {
		return SignedFile{}, err
	}
	mimeType, matches := detectMIME(prefix, extension(resourcePath))
	switch {
	case !matches:
		return SignedFile{}, badRequest(fmt.Sprintf("File content does not match the extension of %q", found.Path), "The file extension doesn't match the file content. Please check that your file is not corrupted and has the correct extension.")
	case !folder.allowsMIME(mimeType):
		return SignedFile{}, badRequest(fmt.Sprintf("MIME type %s is not allowed in file folder %s", mimeType, folder), "This file format is not supported.")
	case mimeType == mimeSVG && stored > maxSVGBytes:
		return SignedFile{}, tooLarge("SVG files above 3MB are not accepted", "SVG files above 3MB cannot be uploaded.")
	}

	if err := s.storage.move(pendingKey, objectKey(workspaceID, found.ApplicationUID, folder, resourcePath)); err != nil {
		return SignedFile{}, err
	}
	updated, err := s.store.markUploaded(ctx, workspaceID, found.ID, mimeType, stored)
	if err != nil {
		return SignedFile{}, err
	}
	if !updated {
		return SignedFile{}, notFound(fmt.Sprintf("File %s was reaped while its upload was being completed", found.ID))
	}
	found.Size = stored
	return s.signed(ctx, workspaceID, found, folder)
}

func (s *Service) signed(ctx context.Context, workspaceID string, found file, folder Folder) (SignedFile, error) {
	token, err := s.tokens.IssueFileToken(ctx, workspaceID, found.ID, s.config.FileTokenTTL)
	if err != nil {
		return SignedFile{}, err
	}
	return SignedFile{
		ID:        found.ID,
		Path:      found.Path,
		Size:      float64(found.Size),
		CreatedAt: metadata.Timestamp{Time: found.CreatedAt},
		URL:       fmt.Sprintf("%s/file/%s/%s?token=%s", s.config.ServerURL, folder, found.ID, token),
	}, nil
}

func (s *Service) CompleteWorkspaceLogo(ctx context.Context, principal auth.Principal, fileID string) (SignedFile, error) {
	workspaceID, err := workspaceOf(principal)
	if err != nil {
		return SignedFile{}, err
	}
	if err := s.authorize(ctx, principal, "You do not have permission to access this feature. Please contact your workspace administrator for access.", flagWorkspace); err != nil {
		return SignedFile{}, err
	}
	return s.completeWorkspaceLogo(ctx, workspaceID, fileID)
}

func (s *Service) CompleteNewWorkspaceLogoUpload(ctx context.Context, principal auth.Principal, workspaceID, fileID string) (SignedFile, error) {
	if err := s.assertPendingWorkspace(ctx, principal, workspaceID); err != nil {
		return SignedFile{}, err
	}
	return s.completeWorkspaceLogo(ctx, workspaceID, fileID)
}

func (s *Service) completeWorkspaceLogo(ctx context.Context, workspaceID, fileID string) (SignedFile, error) {
	found, err := s.lookup(ctx, workspaceID, fileID, FolderCorePicture)
	if err != nil {
		return SignedFile{}, err
	}
	current, err := s.store.logoFileID(ctx, workspaceID)
	if err != nil {
		return SignedFile{}, err
	}
	if current == found.ID {
		return s.signed(ctx, workspaceID, found, FolderCorePicture)
	}
	completed, err := s.complete(ctx, workspaceID, fileID, FolderCorePicture)
	if err != nil {
		return SignedFile{}, err
	}
	replaced, err := s.store.bindLogo(ctx, workspaceID, fileID)
	if err != nil {
		return SignedFile{}, err
	}
	if replaced != "" {
		if err := s.deleteCorePicture(ctx, workspaceID, replaced); err != nil {
			return SignedFile{}, err
		}
	}
	return completed, nil
}

func (s *Service) CompleteProfilePicture(ctx context.Context, principal auth.Principal, fileID string) (SignedFile, error) {
	workspaceID, err := workspaceOf(principal)
	if err != nil {
		return SignedFile{}, err
	}
	creating, err := s.isCreating(ctx, workspaceID)
	if err != nil {
		return SignedFile{}, err
	}
	if !creating {
		const denied = "You do not have permission to upload profile pictures. Please contact your workspace administrator for access."
		if err := s.authorize(ctx, principal, denied, flagWorkspaceMembers, flagProfileInformation); err != nil {
			return SignedFile{}, err
		}
	}
	if _, err := s.lookup(ctx, workspaceID, fileID, FolderCorePicture); err != nil {
		return SignedFile{}, err
	}
	completed, err := s.complete(ctx, workspaceID, fileID, FolderCorePicture)
	if err != nil {
		return SignedFile{}, err
	}
	if err := s.store.claimProfilePicture(ctx, workspaceID, fileID); err != nil {
		return SignedFile{}, err
	}
	return completed, nil
}

func (s *Service) deleteCorePicture(ctx context.Context, workspaceID, fileID string) error {
	found, err := s.lookup(ctx, workspaceID, fileID, FolderCorePicture)
	if err != nil {
		return err
	}
	folder, resourcePath := splitPath(found.Path)
	if err := s.storage.remove(objectKey(workspaceID, found.ApplicationUID, folder, resourcePath)); err != nil {
		return err
	}
	return s.store.deleteFile(ctx, workspaceID, fileID)
}

func (s *Service) receive(ctx context.Context, workspaceID, fileID string, body io.Reader) error {
	found, err := s.lookup(ctx, workspaceID, fileID, "")
	if err != nil {
		return err
	}
	if found.Status != statusPending {
		return badRequest(fmt.Sprintf("File %s is not awaiting an upload", fileID), "This file has already been uploaded.")
	}
	folder, resourcePath := splitPath(found.Path)
	key := objectKey(workspaceID, found.ApplicationUID, folder, pendingResourcePath(found.ID, resourcePath))
	written, err := s.storage.write(key, body, found.Size)
	switch {
	case errors.Is(err, errObjectTooLarge):
		return tooLarge(fmt.Sprintf("Upload exceeds declared size of %d bytes", found.Size), "The uploaded file is larger than declared.")
	case err != nil:
		return err
	case written != found.Size:
		return errors.Join(sizeMismatch(fmt.Sprintf("Uploaded %d bytes but %d were declared", written, found.Size)), s.storage.remove(key))
	}
	return nil
}

type servedFile struct {
	Content      *os.File
	MIMEType     string
	CacheControl string
}

func (s *Service) openByID(ctx context.Context, workspaceID, fileID string, folder Folder) (servedFile, error) {
	found, err := s.lookup(ctx, workspaceID, fileID, folder)
	if err != nil {
		return servedFile{}, err
	}
	if found.Status != statusUploaded {
		return servedFile{}, notFound("File not found: " + fileID)
	}
	return s.open(workspaceID, found, folder)
}

func (s *Service) openPublicAsset(ctx context.Context, workspaceID, applicationID, assetPath string) (servedFile, error) {
	found, err := s.store.publicAsset(ctx, workspaceID, applicationID, assetPath)
	if errors.Is(err, errFileMissing) {
		return servedFile{}, notFound("File not found")
	}
	if err != nil {
		return servedFile{}, err
	}
	return s.open(workspaceID, found, FolderPublicAsset)
}

func (s *Service) open(workspaceID string, found file, folder Folder) (servedFile, error) {
	_, resourcePath := splitPath(found.Path)
	content, err := s.storage.open(objectKey(workspaceID, found.ApplicationUID, folder, resourcePath))
	if errors.Is(err, errObjectNotFound) {
		return servedFile{}, notFound("File not found: " + found.ID)
	}
	if err != nil {
		return servedFile{}, err
	}
	return servedFile{Content: content, MIMEType: found.MIMEType, CacheControl: folderConfigs[folder].cacheControl}, nil
}
