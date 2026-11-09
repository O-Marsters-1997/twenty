package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	VersionDraft       = "DRAFT"
	VersionActive      = "ACTIVE"
	VersionDeactivated = "DEACTIVATED"

	VisibilityWorkspace = "WORKSPACE"
	VisibilityPrivate   = "PRIVATE"

	standardApplicationUniversalIdentifier = "20202020-64aa-4b6f-b003-9c74b97cee20"
)

var (
	ErrForbidden    = errors.New("workflow action forbidden")
	ErrInvalidInput = errors.New("invalid workflow input")
	ErrConflict     = errors.New("workflow version changed")
)

type CoreWorkflow struct {
	ID                         string
	Name                       *string
	Statuses                   []string
	LastPublishedVersionID     *string
	LastPublishedCoreVersionID *string
	ApplicationID              *string
	WorkspaceWorkflowID        *string
	IsSystem                   bool
	Visibility                 string
	CanChangeVisibility        bool
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type CoreVersion struct {
	ID                 string
	CoreWorkflowID     string
	Label              string
	Status             string
	WorkspaceVersionID *string
	WorkspaceWorkflow  *string
	Trigger            json.RawMessage
	Steps              json.RawMessage
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type DeletedWorkflow struct {
	ID                  string
	WorkspaceWorkflowID *string
}

type querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func forbidden(message string) error { return fmt.Errorf("%w: %s", ErrForbidden, message) }

func optionalJSON(raw json.RawMessage, wrapInArray bool) any {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if wrapInArray {
		return "[" + string(raw) + "]"
	}
	return string(raw)
}

const workflowColumns = `w.id::text, w.name, coalesce(s.statuses, '{}'), w."lastPublishedVersionId"::text,
	w."lastPublishedCoreWorkflowVersionId"::text, w."applicationId"::text, w."workspaceWorkflowId"::text, w."isSystem", w.visibility,
	(w."createdByUserWorkspaceId" IS NULL OR w."createdByUserWorkspaceId"::text = $2), w."createdAt", w."updatedAt"`

const workflowFrom = `FROM core.workflow w LEFT JOIN LATERAL (
	SELECT array_remove(ARRAY[
		CASE WHEN bool_or(v.status = 'DRAFT') THEN 'DRAFT' END,
		CASE WHEN bool_or(v.status = 'ACTIVE') THEN 'ACTIVE' END,
		CASE WHEN NOT bool_or(v.status = 'ACTIVE') AND bool_or(v.status = 'DEACTIVATED') THEN 'DEACTIVATED' END
	], NULL) AS statuses FROM core."workflowVersion" v WHERE v."coreWorkflowId" = w.id) s ON true`

func scanWorkflow(row pgx.Row) (CoreWorkflow, error) {
	var w CoreWorkflow
	err := row.Scan(&w.ID, &w.Name, &w.Statuses, &w.LastPublishedVersionID, &w.LastPublishedCoreVersionID, &w.ApplicationID,
		&w.WorkspaceWorkflowID, &w.IsSystem, &w.Visibility, &w.CanChangeVisibility, &w.CreatedAt, &w.UpdatedAt)
	return w, err
}

func workflowByID(ctx context.Context, q querier, id, userWorkspaceID string) (CoreWorkflow, error) {
	w, err := scanWorkflow(q.QueryRow(ctx, `SELECT `+workflowColumns+` `+workflowFrom+` WHERE w."workspaceId" = $1 AND w.id = $3::uuid`,
		workspace.PinnedWorkspaceID, userWorkspaceID, id))
	if err != nil {
		return CoreWorkflow{}, fmt.Errorf("select core workflow: %w", notFound(err))
	}
	return w, nil
}

func (s *Store) CoreWorkflow(ctx context.Context, id, userWorkspaceID string) (*CoreWorkflow, error) {
	w, err := workflowByID(ctx, s.pool, id, userWorkspaceID)
	if errors.Is(err, ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if w.Visibility == VisibilityPrivate && !w.CanChangeVisibility {
		return nil, nil
	}
	return &w, nil
}

type workflowAccess struct {
	visibility string
	owner      *string
	managed    bool
}

func assertAccessible(ctx context.Context, q querier, ids []string, userWorkspaceID string, editable bool) error {
	rows, err := q.Query(ctx, `SELECT w.visibility, w."createdByUserWorkspaceId"::text,
			NOT (w."applicationId" = ws."workspaceCustomApplicationId" OR w."applicationId" = a.id)
		FROM core.workflow w JOIN core.workspace ws ON ws.id = w."workspaceId"
		LEFT JOIN core.application a ON a."universalIdentifier" = $3::uuid AND a."workspaceId" = ws.id
		WHERE w."workspaceId" = $1 AND w.id = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, ids, standardApplicationUniversalIdentifier)
	if err != nil {
		return fmt.Errorf("select workflow access: %w", err)
	}
	accessList, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (workflowAccess, error) {
		var a workflowAccess
		err := row.Scan(&a.visibility, &a.owner, &a.managed)
		return a, err
	})
	if err != nil {
		return fmt.Errorf("scan workflow access: %w", err)
	}
	for _, a := range accessList {
		if a.visibility == VisibilityPrivate && a.owner != nil && *a.owner != userWorkspaceID {
			return forbidden("Workflow not found")
		}
	}
	for _, a := range accessList {
		if editable && a.managed {
			return forbidden("This workflow is managed by an application and is read-only")
		}
	}
	return nil
}

func (s *Store) AssertEditable(ctx context.Context, userWorkspaceID string, workflowIDs ...string) error {
	return assertAccessible(ctx, s.pool, workflowIDs, userWorkspaceID, true)
}

func (s *Store) AssertAccessible(ctx context.Context, userWorkspaceID string, workflowIDs ...string) error {
	return assertAccessible(ctx, s.pool, workflowIDs, userWorkspaceID, false)
}

func (s *Store) CreateWorkflow(ctx context.Context, name *string, visibility, userWorkspaceID string) (CoreWorkflow, error) {
	var id string
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `INSERT INTO core.workflow (name, "universalIdentifier", "applicationId", "workspaceId", visibility, "createdByUserWorkspaceId")
			SELECT $2, gen_random_uuid(), ws."workspaceCustomApplicationId", ws.id, $3, nullif($4, '')::uuid
			FROM core.workspace ws WHERE ws.id = $1 RETURNING id::text`,
			workspace.PinnedWorkspaceID, name, visibility, userWorkspaceID).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert core workflow: %w", err)
		}
		_, err = insertDraft(ctx, tx, id, nil, nil)
		return err
	})
	if err != nil {
		return CoreWorkflow{}, err
	}
	return workflowByID(ctx, s.pool, id, userWorkspaceID)
}

func insertDraft(ctx context.Context, q querier, workflowID string, trigger, steps json.RawMessage) (string, error) {
	var id string
	err := q.QueryRow(ctx, `INSERT INTO core."workflowVersion" ("workspaceId", "coreWorkflowId", "universalIdentifier", "applicationId", triggers, steps, status)
		SELECT w."workspaceId", w.id, gen_random_uuid(), ws."workspaceCustomApplicationId", $2::jsonb, $3::jsonb, 'DRAFT'
		FROM core.workflow w JOIN core.workspace ws ON ws.id = w."workspaceId" WHERE w.id = $1::uuid RETURNING id::text`,
		workflowID, optionalJSON(trigger, true), optionalJSON(steps, false)).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("insert draft version: %w", err)
	}
	return id, nil
}

func (s *Store) CreateDraft(ctx context.Context, workflowID string, trigger, steps json.RawMessage) (string, error) {
	return insertDraft(ctx, s.pool, workflowID, trigger, steps)
}

func (s *Store) Rename(ctx context.Context, id, name string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE core.workflow SET name = $3, "updatedAt" = now() WHERE "workspaceId" = $1 AND id = $2::uuid`, workspace.PinnedWorkspaceID, id, name)
	if err != nil {
		return fmt.Errorf("rename core workflow: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("rename core workflow: %w", ErrNotFound)
	}
	return nil
}

func (s *Store) SetVisibility(ctx context.Context, id, visibility, userWorkspaceID string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `UPDATE core.workflow SET visibility = $3, "createdByUserWorkspaceId" = $4::uuid, "updatedAt" = now()
		WHERE "workspaceId" = $1 AND id = $2::uuid AND ("createdByUserWorkspaceId" IS NULL OR "createdByUserWorkspaceId" = $4::uuid)`,
		workspace.PinnedWorkspaceID, id, visibility, userWorkspaceID)
	if err != nil {
		return false, fmt.Errorf("update core workflow visibility: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return true, nil
	}
	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core.workflow WHERE "workspaceId" = $1 AND id = $2::uuid)`, workspace.PinnedWorkspaceID, id).Scan(&exists); err != nil {
		return false, fmt.Errorf("select core workflow: %w", err)
	}
	if exists {
		return false, forbidden("Only the person who created this workflow can change who sees it")
	}
	return false, nil
}

func (s *Store) DeleteWorkflows(ctx context.Context, ids []string) ([]DeletedWorkflow, error) {
	var deleted []DeletedWorkflow
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM core."workflowVersion" WHERE "workspaceId" = $1 AND "coreWorkflowId" = ANY($2::uuid[])`, workspace.PinnedWorkspaceID, ids); err != nil {
			return fmt.Errorf("delete core versions: %w", err)
		}
		rows, err := tx.Query(ctx, `DELETE FROM core.workflow WHERE "workspaceId" = $1 AND id = ANY($2::uuid[]) RETURNING id::text, "workspaceWorkflowId"::text`, workspace.PinnedWorkspaceID, ids)
		if err != nil {
			return fmt.Errorf("delete core workflows: %w", err)
		}
		deleted, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (DeletedWorkflow, error) {
			var d DeletedWorkflow
			err := row.Scan(&d.ID, &d.WorkspaceWorkflowID)
			return d, err
		})
		return err
	})
	if err != nil {
		return nil, err
	}
	return deleted, nil
}

const versionSelectSQL = `SELECT v.id::text, v."coreWorkflowId"::text, 'v' || row_number() OVER (PARTITION BY v."coreWorkflowId" ORDER BY v."createdAt", v.id),
		v.status::text, v."workspaceWorkflowVersionId"::text, w."workspaceWorkflowId"::text, v.triggers->0, v.steps, v."createdAt", v."updatedAt"
	FROM core."workflowVersion" v JOIN core.workflow w ON w.id = v."coreWorkflowId" WHERE v."workspaceId" = $1`

const lockedVersionSQL = `SELECT v.id::text, v."coreWorkflowId"::text, '', v.status::text, v."workspaceWorkflowVersionId"::text, null::text, v.triggers->0, v.steps, v."createdAt", v."updatedAt"
	FROM core."workflowVersion" v WHERE v."workspaceId" = $1 AND v.id = $2::uuid FOR UPDATE`

func scanVersionRow(row pgx.Row) (CoreVersion, error) {
	var v CoreVersion
	err := row.Scan(&v.ID, &v.CoreWorkflowID, &v.Label, &v.Status, &v.WorkspaceVersionID, &v.WorkspaceWorkflow, &v.Trigger, &v.Steps, &v.CreatedAt, &v.UpdatedAt)
	return v, err
}

func versionByID(ctx context.Context, q querier, id string, lock bool) (CoreVersion, error) {
	query := `SELECT * FROM (` + versionSelectSQL + `) labelled WHERE id = $2`
	if lock {
		query = lockedVersionSQL
	}
	v, err := scanVersionRow(q.QueryRow(ctx, query, workspace.PinnedWorkspaceID, id))
	if err != nil {
		return CoreVersion{}, fmt.Errorf("select core version: %w", notFound(err))
	}
	return v, nil
}

func (s *Store) CoreVersion(ctx context.Context, id string) (CoreVersion, error) {
	return versionByID(ctx, s.pool, id, false)
}

func (s *Store) CountVersions(ctx context.Context, workflowID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT count(*) FROM core."workflowVersion" WHERE "workspaceId" = $1 AND "coreWorkflowId" = $2::uuid`, workspace.PinnedWorkspaceID, workflowID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count core versions: %w", err)
	}
	return count, nil
}

func (s *Store) DraftVersionID(ctx context.Context, workflowID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx, `SELECT id::text FROM core."workflowVersion" WHERE "workspaceId" = $1 AND "coreWorkflowId" = $2::uuid AND status = 'DRAFT' ORDER BY "createdAt" LIMIT 1`,
		workspace.PinnedWorkspaceID, workflowID).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("select draft version: %w", notFound(err))
	}
	return id, nil
}

func (s *Store) DeleteVersion(ctx context.Context, id string) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM core."workflowVersion" WHERE "workspaceId" = $1 AND id = $2::uuid`, workspace.PinnedWorkspaceID, id); err != nil {
		return fmt.Errorf("delete core version: %w", err)
	}
	return nil
}

func (s *Store) FirstObjectName(ctx context.Context) (string, error) {
	var name string
	err := s.pool.QueryRow(ctx, `SELECT "nameSingular" FROM core."objectMetadata" WHERE "workspaceId" = $1 AND "isActive" AND NOT "isSystem" ORDER BY "createdAt", id LIMIT 1`, workspace.PinnedWorkspaceID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("select first object: %w", err)
	}
	return name, nil
}

func (s *Store) WriteContent(ctx context.Context, id string, expected CoreVersion, trigger, steps json.RawMessage) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		current, err := versionByID(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if current.Status != VersionDraft || !sameJSON(current.Trigger, expected.Trigger) || !sameJSON(current.Steps, expected.Steps) {
			return fmt.Errorf("%w: reload and retry", ErrConflict)
		}
		if _, err := tx.Exec(ctx, `UPDATE core."workflowVersion" SET triggers = $3::jsonb, steps = $4::jsonb, "updatedAt" = now() WHERE "workspaceId" = $1 AND id = $2::uuid`,
			workspace.PinnedWorkspaceID, id, optionalJSON(trigger, true), optionalJSON(steps, false)); err != nil {
			return fmt.Errorf("update core version content: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE core.workflow SET "updatedAt" = now() WHERE "workspaceId" = $1 AND id = $2::uuid`, workspace.PinnedWorkspaceID, current.CoreWorkflowID); err != nil {
			return fmt.Errorf("touch core workflow: %w", err)
		}
		return nil
	})
}

func sameJSON(left, right json.RawMessage) bool {
	var leftValue, rightValue any
	if len(left) > 0 {
		_ = json.Unmarshal(left, &leftValue)
	}
	if len(right) > 0 {
		_ = json.Unmarshal(right, &rightValue)
	}
	leftBytes, _ := json.Marshal(leftValue)
	rightBytes, _ := json.Marshal(rightValue)
	return string(leftBytes) == string(rightBytes)
}

func (s *Store) Activate(ctx context.Context, id string) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		v, err := versionByID(ctx, tx, id, true)
		if err != nil {
			return err
		}
		var lastPublished *string
		if err := tx.QueryRow(ctx, `SELECT "lastPublishedCoreWorkflowVersionId"::text FROM core.workflow WHERE id = $1::uuid FOR UPDATE`, v.CoreWorkflowID).Scan(&lastPublished); err != nil {
			return fmt.Errorf("lock core workflow: %w", notFound(err))
		}
		isLastPublished := lastPublished != nil && *lastPublished == v.ID
		if v.Status != VersionDraft && (v.Status != VersionDeactivated || !isLastPublished) {
			return fmt.Errorf("%w: Cannot activate non-draft or non-last-published version", ErrInvalidInput)
		}
		var active *string
		err = tx.QueryRow(ctx, `SELECT id::text FROM core."workflowVersion" WHERE "workspaceId" = $1 AND "coreWorkflowId" = $2::uuid AND status = 'ACTIVE'`, workspace.PinnedWorkspaceID, v.CoreWorkflowID).Scan(&active)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("select active version: %w", err)
		}
		if active != nil && *active == v.ID {
			return forbidden("Cannot have more than one active workflow version")
		}
		previous := active
		if previous == nil && lastPublished != nil && *lastPublished != v.ID {
			previous = lastPublished
		}
		if previous != nil {
			if _, err := tx.Exec(ctx, `UPDATE core."workflowVersion" SET status = 'ARCHIVED', "updatedAt" = now() WHERE id = $1::uuid`, *previous); err != nil {
				return fmt.Errorf("archive previous version: %w", err)
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE core."workflowVersion" SET status = 'ACTIVE', "updatedAt" = now() WHERE id = $1::uuid`, v.ID); err != nil {
			return fmt.Errorf("activate version: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE core.workflow SET "lastPublishedCoreWorkflowVersionId" = $2::uuid, "lastPublishedVersionId" = $3::uuid, "updatedAt" = now() WHERE id = $1::uuid`,
			v.CoreWorkflowID, v.ID, v.WorkspaceVersionID); err != nil {
			return fmt.Errorf("update last published version: %w", err)
		}
		return nil
	})
}

func (s *Store) Deactivate(ctx context.Context, id string) error {
	if _, err := s.pool.Exec(ctx, `UPDATE core."workflowVersion" SET status = 'DEACTIVATED', "updatedAt" = now() WHERE "workspaceId" = $1 AND id = $2::uuid AND status = 'ACTIVE'`, workspace.PinnedWorkspaceID, id); err != nil {
		return fmt.Errorf("deactivate version: %w", err)
	}
	return nil
}
