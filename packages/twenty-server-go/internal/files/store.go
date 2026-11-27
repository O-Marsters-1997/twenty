package files

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	statusPending  = "PENDING"
	statusUploaded = "UPLOADED"

	pendingSettings   = `{"isTemporaryFile": true, "toDelete": false}`
	finalizedSettings = `{"isTemporaryFile": false, "toDelete": false}`

	activationPending = "PENDING_CREATION"
	activationOngoing = "ONGOING_CREATION"
	activationSuspend = "SUSPENDED"
)

type file struct {
	ID             string
	Path           string
	Size           int64
	MIMEType       string
	Status         string
	ApplicationID  string
	ApplicationUID string
	CreatedAt      time.Time
	IsTemporary    bool
}

type store struct{ pool *pgxpool.Pool }

const fileColumns = `f.id::text, f.path, f.size, f."mimeType", f.status::text, f."applicationId"::text, a."universalIdentifier"::text,
	f."createdAt", COALESCE((f.settings->>'isTemporaryFile')::boolean, false)`

func scanFile(row pgx.Row) (file, error) {
	var found file
	err := row.Scan(&found.ID, &found.Path, &found.Size, &found.MIMEType, &found.Status, &found.ApplicationID, &found.ApplicationUID,
		&found.CreatedAt, &found.IsTemporary)
	if errors.Is(err, pgx.ErrNoRows) {
		return file{}, errFileMissing
	}
	if err != nil {
		return file{}, fmt.Errorf("read file: %w", err)
	}
	return found, nil
}

var errFileMissing = errors.New("file row not found")

func (s store) file(ctx context.Context, workspaceID, fileID, folderPrefix string) (file, error) {
	if _, err := uuid.Parse(fileID); err != nil {
		return file{}, errFileMissing
	}
	return scanFile(s.pool.QueryRow(ctx,
		`SELECT `+fileColumns+` FROM core.file f JOIN core.application a ON a.id = f."applicationId"
		 WHERE f."workspaceId" = $1::uuid AND f.id = $2::uuid AND f."deletedAt" IS NULL AND f.path LIKE $3`,
		workspaceID, fileID, folderPrefix+"%"))
}

func (s store) publicAsset(ctx context.Context, workspaceID, applicationID, path string) (file, error) {
	if _, err := uuid.Parse(applicationID); err != nil {
		return file{}, errFileMissing
	}
	return scanFile(s.pool.QueryRow(ctx,
		`SELECT `+fileColumns+` FROM core.file f JOIN core.application a ON a.id = f."applicationId"
		 WHERE f."workspaceId" = $1::uuid AND f."applicationId" = $2::uuid AND f.path = $3 AND f.status = 'UPLOADED' AND f."deletedAt" IS NULL`,
		workspaceID, applicationID, string(FolderPublicAsset)+"/"+path))
}

type uploadLocation struct{ ApplicationID, ApplicationUID, ResourcePrefix string }

func (s store) customApplication(ctx context.Context, workspaceID string) (uploadLocation, string, error) {
	var location uploadLocation
	var activation string
	err := s.pool.QueryRow(ctx,
		`SELECT a.id::text, a."universalIdentifier"::text, w."activationStatus"::text
		 FROM core.workspace w JOIN core.application a ON a.id = w."workspaceCustomApplicationId" WHERE w.id = $1::uuid`,
		workspaceID).Scan(&location.ApplicationID, &location.ApplicationUID, &activation)
	if errors.Is(err, pgx.ErrNoRows) {
		return uploadLocation{}, "", notFound("Could not find the workspace custom application")
	}
	if err != nil {
		return uploadLocation{}, "", fmt.Errorf("look up workspace application: %w", err)
	}
	return location, activation, nil
}

func (s store) fieldApplication(ctx context.Context, workspaceID, fieldID, fieldUID string) (uploadLocation, error) {
	for _, id := range []string{fieldID, fieldUID} {
		if _, err := uuid.Parse(id); id != "" && err != nil {
			return uploadLocation{}, notFound("Field metadata not found")
		}
	}
	var location uploadLocation
	err := s.pool.QueryRow(ctx,
		`SELECT a.id::text, a."universalIdentifier"::text, fm."universalIdentifier"::text
		 FROM core."fieldMetadata" fm JOIN core.application a ON a.id = fm."applicationId"
		 WHERE fm."workspaceId" = $1::uuid
		   AND (NULLIF($2, '') IS NULL OR fm.id = NULLIF($2, '')::uuid)
		   AND (NULLIF($3, '') IS NULL OR fm."universalIdentifier" = NULLIF($3, '')::uuid)`,
		workspaceID, fieldID, fieldUID).Scan(&location.ApplicationID, &location.ApplicationUID, &location.ResourcePrefix)
	if errors.Is(err, pgx.ErrNoRows) {
		return uploadLocation{}, notFound("Field metadata not found")
	}
	if err != nil {
		return uploadLocation{}, fmt.Errorf("look up field application: %w", err)
	}
	return location, nil
}

func (s store) insertPending(ctx context.Context, workspaceID, applicationID, fileID, path string, size int64) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO core.file (id, size, "workspaceId", "applicationId", path, "mimeType", status, settings)
		 VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, 'PENDING', $7::jsonb)`,
		fileID, size, workspaceID, applicationID, path, mimeOctetStream, pendingSettings)
	if err != nil {
		return fmt.Errorf("insert pending file: %w", err)
	}
	return nil
}

func (s store) markUploaded(ctx context.Context, workspaceID, fileID, mimeType string, size int64) (bool, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE core.file SET status = 'UPLOADED', "mimeType" = $3, size = $4, "updatedAt" = now()
		 WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND status = 'PENDING'`,
		fileID, workspaceID, mimeType, size)
	if err != nil {
		return false, fmt.Errorf("mark file uploaded: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

func (s store) deleteFile(ctx context.Context, workspaceID, fileID string) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM core.file WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, fileID, workspaceID); err != nil {
		return fmt.Errorf("delete file: %w", err)
	}
	return nil
}

func (s store) activationStatus(ctx context.Context, workspaceID string) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT "activationStatus"::text FROM core.workspace WHERE id = $1::uuid`, workspaceID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("read activation status: %w", err)
	}
	return status, nil
}

func (s store) logoFileID(ctx context.Context, workspaceID string) (string, error) {
	var logo *string
	if err := s.pool.QueryRow(ctx, `SELECT "logoFileId"::text FROM core.workspace WHERE id = $1::uuid`, workspaceID).Scan(&logo); err != nil {
		return "", fmt.Errorf("read workspace logo: %w", err)
	}
	if logo == nil {
		return "", nil
	}
	return *logo, nil
}

func claimTemporary(ctx context.Context, tx pgx.Tx, workspaceID, fileID string) error {
	var temporary bool
	err := tx.QueryRow(ctx,
		`SELECT COALESCE((settings->>'isTemporaryFile')::boolean, false) FROM core.file
		 WHERE id = $1::uuid AND "workspaceId" = $2::uuid FOR UPDATE`, fileID, workspaceID).Scan(&temporary)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("File not found: " + fileID)
	}
	if err != nil {
		return fmt.Errorf("lock file: %w", err)
	}
	if !temporary {
		return badRequest("File "+fileID+" was already finalized", "This file upload has already been finalized.")
	}
	if _, err := tx.Exec(ctx, `UPDATE core.file SET settings = $3::jsonb WHERE id = $1::uuid AND "workspaceId" = $2::uuid`,
		fileID, workspaceID, finalizedSettings); err != nil {
		return fmt.Errorf("claim file: %w", err)
	}
	return nil
}

func (s store) claimProfilePicture(ctx context.Context, workspaceID, fileID string) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error { return claimTemporary(ctx, tx, workspaceID, fileID) })
}

func (s store) bindLogo(ctx context.Context, workspaceID, fileID string) (replaced string, err error) {
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var current *string
		if err := tx.QueryRow(ctx, `SELECT "logoFileId"::text FROM core.workspace WHERE id = $1::uuid FOR UPDATE`, workspaceID).Scan(&current); err != nil {
			return fmt.Errorf("lock workspace: %w", err)
		}
		if current != nil && *current == fileID {
			return nil
		}
		if err := claimTemporary(ctx, tx, workspaceID, fileID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE core.workspace SET "logoFileId" = $2::uuid, "updatedAt" = now() WHERE id = $1::uuid`, workspaceID, fileID); err != nil {
			return fmt.Errorf("set workspace logo: %w", err)
		}
		if current != nil {
			replaced = *current
		}
		return nil
	})
	return replaced, err
}

func (s store) isPendingWorkspaceMember(ctx context.Context, userID, workspaceID string) (bool, error) {
	if _, err := uuid.Parse(workspaceID); err != nil {
		return false, nil
	}
	var allowed bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1 FROM core.workspace w JOIN core."userWorkspace" uw ON uw."workspaceId" = w.id
			WHERE w.id = $2::uuid AND uw."userId" = $1::uuid AND uw."deletedAt" IS NULL AND w."activationStatus" = 'PENDING_CREATION')`,
		userID, workspaceID).Scan(&allowed)
	if err != nil {
		return false, fmt.Errorf("check pending workspace: %w", err)
	}
	return allowed, nil
}
