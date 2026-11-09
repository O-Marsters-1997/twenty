package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

var (
	ErrInvalidInput = errors.New("invalid workflow input")
	ErrForbidden    = errors.New("workflow not found")
)

const (
	CoreOrderByName  = "NAME"
	CoreDirectionAsc = "ASC"

	maxPageSize     = 200
	timestampLayout = "2006-01-02T15:04:05.000Z"
)

type CoreWorkflow struct {
	ID                                 string
	Name                               *string
	Statuses                           []string
	LastPublishedVersionID             *string
	LastPublishedCoreWorkflowVersionID *string
	ApplicationID                      *string
	WorkspaceWorkflowID                *string
	IsSystem                           bool
	Visibility                         string
	CanChangeVisibility                bool
	CreatedAt                          string
	UpdatedAt                          string
}

type CoreVersion struct {
	ID                         string
	CoreWorkflowID             *string
	Label                      string
	Status                     string
	WorkspaceWorkflowVersionID *string
	WorkspaceWorkflowID        *string
	Trigger                    any
	Steps                      any
	CreatedAt                  string
	UpdatedAt                  string
}

type CoreWorkflowEdge struct {
	Node   CoreWorkflow
	Cursor string
}

type CoreWorkflowPageInfo struct {
	EndCursor   *string
	HasNextPage bool
}

type CoreWorkflowConnection struct {
	Edges      []CoreWorkflowEdge
	PageInfo   CoreWorkflowPageInfo
	TotalCount int
}

type CoreWorkflowWithVersions struct {
	Workflow       CoreWorkflow
	Versions       []CoreVersion
	CurrentVersion CoreVersion
}

type CoreWorkflowPage struct {
	First         int
	After         *string
	OrderBy       string
	Direction     string
	Filter        *CoreWorkflowFilter
	IncludeSystem bool
}

// Reader identifies whose private workflows a read may include; the zero value is an API key.
type Reader struct{ UserWorkspaceID string }

func (r Reader) param() any {
	if r.UserWorkspaceID == "" {
		return nil
	}
	return r.UserWorkspaceID
}

const (
	readerVisibility = `(c.visibility = 'WORKSPACE' OR (c."createdByUserWorkspaceId" IS NULL OR c."createdByUserWorkspaceId" = $2::uuid))`
	workflowColumns  = `c.id::text, c."workspaceWorkflowId"::text, c.name, c."lastPublishedVersionId"::text,
		c."lastPublishedCoreWorkflowVersionId"::text, c."applicationId"::text, c."isSystem", c.visibility,
		coalesce((c."createdByUserWorkspaceId" IS NULL OR c."createdByUserWorkspaceId" = $2::uuid), false),
		c."createdAt", c."updatedAt"`
	statusColumns = `coalesce(bool_or(v.status = 'DRAFT'), false), coalesce(bool_or(v.status = 'ACTIVE'), false),
		coalesce(bool_or(v.status = 'DEACTIVATED'), false)`
	versionJoin  = `LEFT JOIN core."workflowVersion" v ON v."coreWorkflowId" = c.id AND v."workspaceId" = $1`
	groupColumns = `c.id, c.name, c."createdAt", c."updatedAt", c."lastPublishedVersionId", c."applicationId", c."workspaceWorkflowId"`
)

func formatTime(t time.Time) string { return t.UTC().Format(timestampLayout) }

func workspaceID() string { return workspace.PinnedWorkspaceID }

func computeStatuses(draft, active, deactivated bool) []string {
	result := []string{}
	if draft {
		result = append(result, "DRAFT")
	}
	if active {
		result = append(result, "ACTIVE")
	}
	if !active && deactivated {
		result = append(result, "DEACTIVATED")
	}
	return result
}

type workflowScanner struct {
	workflow                   CoreWorkflow
	createdAt, updatedAt       time.Time
	draft, active, deactivated bool
	extra                      []any
}

func (s *workflowScanner) targets() []any {
	w := &s.workflow
	targets := []any{&w.ID, &w.WorkspaceWorkflowID, &w.Name, &w.LastPublishedVersionID, &w.LastPublishedCoreWorkflowVersionID,
		&w.ApplicationID, &w.IsSystem, &w.Visibility, &w.CanChangeVisibility, &s.createdAt, &s.updatedAt,
		&s.draft, &s.active, &s.deactivated}
	return append(targets, s.extra...)
}

func (s *workflowScanner) result() CoreWorkflow {
	w := s.workflow
	w.Statuses = computeStatuses(s.draft, s.active, s.deactivated)
	w.CreatedAt, w.UpdatedAt = formatTime(s.createdAt), formatTime(s.updatedAt)
	return w
}

func systemPredicate(includeSystem bool) string {
	if includeSystem {
		return ""
	}
	return `AND c."isSystem" = false`
}

type cursor struct {
	SortValue *string `json:"sortValue"`
	ID        string  `json:"id"`
}

func encodeCursor(c cursor) (string, error) {
	raw, err := json.Marshal(c)
	if err != nil {
		return "", fmt.Errorf("encode cursor: %w", err)
	}
	return base64.StdEncoding.EncodeToString(raw), nil
}

func decodeCursor(encoded string) (cursor, error) {
	var c cursor
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err == nil {
		err = json.Unmarshal(raw, &c)
	}
	if err == nil {
		_, err = uuid.Parse(c.ID)
	}
	if err == nil && c.SortValue != nil && strings.Contains(*c.SortValue, "T") {
		_, err = time.Parse(time.RFC3339Nano, *c.SortValue)
	}
	if err != nil {
		return cursor{}, fmt.Errorf("cursor %q: %w", encoded, ErrInvalidInput)
	}
	return c, nil
}

func (s *Store) CoreWorkflows(ctx context.Context, reader Reader, page CoreWorkflowPage) (CoreWorkflowConnection, error) {
	if page.First < 1 || page.First > maxPageSize {
		return CoreWorkflowConnection{}, fmt.Errorf("first must be between 1 and %d: %w", maxPageSize, ErrInvalidInput)
	}
	column, cursorExpression, nullable, cast := `c."updatedAt"`,
		`to_char(c."updatedAt" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, false, "::timestamptz"
	if page.OrderBy == CoreOrderByName {
		column, cursorExpression, nullable, cast = "c.name", "c.name", true, ""
	}
	comparator, direction := "<", "DESC"
	if page.Direction == CoreDirectionAsc {
		comparator, direction = ">", "ASC"
	}
	nulls := ""
	if nullable {
		nulls = " NULLS LAST"
	}

	parameters := []any{workspaceID(), reader.param()}
	filter, err := buildFilterPredicate(page.Filter, len(parameters)+1)
	if err != nil {
		return CoreWorkflowConnection{}, err
	}
	parameters = append(parameters, filter.parameters...)
	bind := func(value any) string {
		parameters = append(parameters, value)
		return "$" + strconv.Itoa(len(parameters))
	}

	keyset := ""
	if page.After != nil {
		after, err := decodeCursor(*page.After)
		if err != nil {
			return CoreWorkflowConnection{}, err
		}
		switch {
		case after.SortValue == nil:
			keyset = fmt.Sprintf(`AND (%s IS NULL AND c.id %s %s::uuid)`, column, comparator, bind(after.ID))
		case nullable:
			sortValue, id := bind(*after.SortValue), bind(after.ID)
			keyset = fmt.Sprintf(`AND (%[1]s %[2]s %[3]s%[4]s OR (%[1]s = %[3]s%[4]s AND c.id %[2]s %[5]s::uuid) OR %[1]s IS NULL)`,
				column, comparator, sortValue, cast, id)
		default:
			sortValue, id := bind(*after.SortValue), bind(after.ID)
			keyset = fmt.Sprintf(`AND (%s, c.id) %s (%s%s, %s::uuid)`, column, comparator, sortValue, cast, id)
		}
	}
	having := ""
	if filter.predicate != "" {
		having = "HAVING " + filter.predicate
	}
	limit := bind(page.First + 1)

	rows, err := s.pool.Query(ctx, fmt.Sprintf(`SELECT %s, %s, %s AS "cursorSortValue"
		FROM core.workflow c %s
		WHERE c."workspaceId" = $1 AND %s %s %s
		GROUP BY %s
		%s
		ORDER BY %s %s%s, c.id %s
		LIMIT %s`,
		workflowColumns, statusColumns, cursorExpression, versionJoin, readerVisibility, systemPredicate(page.IncludeSystem), keyset,
		groupColumns, having, column, direction, nulls, direction, limit), parameters...)
	if err != nil {
		return CoreWorkflowConnection{}, fmt.Errorf("select core workflows: %w", err)
	}
	type listed struct {
		workflow CoreWorkflow
		sortKey  *string
	}
	found, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (listed, error) {
		scanner := workflowScanner{}
		var sortKey *string
		scanner.extra = []any{&sortKey}
		err := r.Scan(scanner.targets()...)
		return listed{scanner.result(), sortKey}, err
	})
	if err != nil {
		return CoreWorkflowConnection{}, fmt.Errorf("scan core workflows: %w", err)
	}

	total, err := s.countCoreWorkflows(ctx, reader, filter, page.IncludeSystem)
	if err != nil {
		return CoreWorkflowConnection{}, err
	}
	hasNext := len(found) > page.First
	if hasNext {
		found = found[:page.First]
	}
	connection := CoreWorkflowConnection{Edges: make([]CoreWorkflowEdge, 0, len(found)), TotalCount: total}
	for _, f := range found {
		encoded, err := encodeCursor(cursor{SortValue: f.sortKey, ID: f.workflow.ID})
		if err != nil {
			return CoreWorkflowConnection{}, err
		}
		connection.Edges = append(connection.Edges, CoreWorkflowEdge{Node: f.workflow, Cursor: encoded})
	}
	if n := len(connection.Edges); n > 0 {
		connection.PageInfo.EndCursor = &connection.Edges[n-1].Cursor
	}
	connection.PageInfo.HasNextPage = hasNext
	return connection, nil
}

func (s *Store) countCoreWorkflows(ctx context.Context, reader Reader, filter filterPredicate, includeSystem bool) (int, error) {
	query := fmt.Sprintf(`SELECT count(*) FROM core.workflow c WHERE c."workspaceId" = $1 AND %s %s`, readerVisibility, systemPredicate(includeSystem))
	parameters := []any{workspaceID(), reader.param()}
	if filter.predicate != "" {
		query = fmt.Sprintf(`SELECT count(*) FROM (SELECT c.id FROM core.workflow c %s WHERE c."workspaceId" = $1 AND %s %s GROUP BY %s HAVING %s) filtered`,
			versionJoin, readerVisibility, systemPredicate(includeSystem), `c.id, c.name, c."createdAt", c."updatedAt"`, filter.predicate)
		parameters = append(parameters, filter.parameters...)
	}
	var total int
	if err := s.pool.QueryRow(ctx, query, parameters...).Scan(&total); err != nil {
		return 0, fmt.Errorf("count core workflows: %w", err)
	}
	return total, nil
}

func (s *Store) CoreWorkflow(ctx context.Context, reader Reader, id string) (*CoreWorkflow, error) {
	return s.coreWorkflowWhere(ctx, reader, `c.id = $3::uuid`, id)
}

func (s *Store) CoreWorkflowByWorkspaceWorkflowID(ctx context.Context, reader Reader, id string) (*CoreWorkflow, error) {
	return s.coreWorkflowWhere(ctx, reader, `c."workspaceWorkflowId" = $3::uuid`, id)
}

func (s *Store) coreWorkflowWhere(ctx context.Context, reader Reader, predicate, id string) (*CoreWorkflow, error) {
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`SELECT %s, %s FROM core.workflow c %s
		WHERE c."workspaceId" = $1 AND %s AND %s GROUP BY %s`,
		workflowColumns, statusColumns, versionJoin, readerVisibility, predicate, groupColumns), workspaceID(), reader.param(), id)
	if err != nil {
		return nil, fmt.Errorf("select core workflow: %w", err)
	}
	found, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (CoreWorkflow, error) {
		scanner := workflowScanner{}
		err := r.Scan(scanner.targets()...)
		return scanner.result(), err
	})
	if err != nil {
		return nil, fmt.Errorf("scan core workflow: %w", err)
	}
	if len(found) == 0 {
		return nil, nil
	}
	return &found[0], nil
}

type versionRow struct {
	CoreVersion
	createdAt, updatedAt time.Time
	triggers, steps      any
}

func (s *Store) versionRows(ctx context.Context, workflowIDs []string) ([]versionRow, error) {
	rows, err := s.pool.Query(ctx, `SELECT v.id::text, v."coreWorkflowId"::text, v.status::text, v."workspaceWorkflowVersionId"::text,
			v."createdAt", v."updatedAt", v.triggers, v.steps
		FROM core."workflowVersion" v WHERE v."workspaceId" = $1 AND v."coreWorkflowId" = ANY($2::uuid[])
		ORDER BY v."createdAt", v.id`, workspaceID(), workflowIDs)
	if err != nil {
		return nil, fmt.Errorf("select core versions: %w", err)
	}
	found, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (versionRow, error) {
		var v versionRow
		err := r.Scan(&v.ID, &v.CoreWorkflowID, &v.Status, &v.WorkspaceWorkflowVersionID, &v.createdAt, &v.updatedAt, &v.triggers, &v.steps)
		v.CreatedAt, v.UpdatedAt = formatTime(v.createdAt), formatTime(v.updatedAt)
		return v, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan core versions: %w", err)
	}
	return found, nil
}

func versionLabel(position int) string { return "v" + strconv.Itoa(position) }

func withoutContent(rows []versionRow, workspaceWorkflowID *string) []CoreVersion {
	versions := make([]CoreVersion, len(rows))
	for i, row := range rows {
		version := row.CoreVersion
		version.Label, version.WorkspaceWorkflowID = versionLabel(i+1), workspaceWorkflowID
		versions[len(rows)-1-i] = version
	}
	return versions
}

func firstTrigger(triggers any) any {
	if list, ok := triggers.([]any); ok && len(list) > 0 {
		return list[0]
	}
	return nil
}

func currentVersion(rows []versionRow, lastPublishedID *string) (int, bool) {
	for _, status := range []string{"DRAFT", "ACTIVE"} {
		for i := len(rows) - 1; i >= 0; i-- {
			if rows[i].Status == status {
				return i, true
			}
		}
	}
	if lastPublishedID != nil {
		for i := len(rows) - 1; i >= 0; i-- {
			if rows[i].ID == *lastPublishedID {
				return i, true
			}
		}
	}
	return len(rows) - 1, len(rows) > 0
}

func (s *Store) CoreWorkflowsWithCurrentVersions(ctx context.Context, reader Reader, ids []string) ([]CoreWorkflowWithVersions, error) {
	rows, err := s.pool.Query(ctx, fmt.Sprintf(`SELECT %s, false, false, false FROM core.workflow c
		WHERE c."workspaceId" = $1 AND %s AND c.id = ANY($3::uuid[])`, workflowColumns, readerVisibility), workspaceID(), reader.param(), ids)
	if err != nil {
		return nil, fmt.Errorf("select core workflows: %w", err)
	}
	workflows, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (CoreWorkflow, error) {
		scanner := workflowScanner{}
		err := r.Scan(scanner.targets()...)
		scanner.workflow.CreatedAt, scanner.workflow.UpdatedAt = formatTime(scanner.createdAt), formatTime(scanner.updatedAt)
		return scanner.workflow, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan core workflows: %w", err)
	}
	byID := make(map[string]CoreWorkflow, len(workflows))
	for _, w := range workflows {
		byID[w.ID] = w
	}
	versions, err := s.versionRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	versionsByWorkflow := map[string][]versionRow{}
	for _, v := range versions {
		versionsByWorkflow[*v.CoreWorkflowID] = append(versionsByWorkflow[*v.CoreWorkflowID], v)
	}

	result := []CoreWorkflowWithVersions{}
	for _, id := range ids {
		workflow, visible := byID[id]
		owned := versionsByWorkflow[id]
		position, hasCurrent := currentVersion(owned, workflow.LastPublishedCoreWorkflowVersionID)
		if !visible || !hasCurrent {
			continue
		}
		var draft, active, deactivated bool
		for _, v := range owned {
			draft, active, deactivated = draft || v.Status == "DRAFT", active || v.Status == "ACTIVE", deactivated || v.Status == "DEACTIVATED"
		}
		workflow.Statuses = computeStatuses(draft, active, deactivated)
		current := owned[position].CoreVersion
		current.Label, current.WorkspaceWorkflowID = versionLabel(position+1), workflow.WorkspaceWorkflowID
		current.Trigger, current.Steps = firstTrigger(owned[position].triggers), owned[position].steps
		result = append(result, CoreWorkflowWithVersions{
			Workflow:       workflow,
			Versions:       withoutContent(owned, workflow.WorkspaceWorkflowID),
			CurrentVersion: current,
		})
	}
	return result, nil
}

type workflowAccess struct {
	id                  string
	workspaceWorkflowID *string
	accessible          bool
}

func (s *Store) workflowAccess(ctx context.Context, reader Reader, predicate, arg string) (*workflowAccess, error) {
	var access workflowAccess
	err := s.pool.QueryRow(ctx, `SELECT c.id::text, c."workspaceWorkflowId"::text,
			coalesce(c.visibility <> 'PRIVATE' OR c."createdByUserWorkspaceId" IS NULL OR c."createdByUserWorkspaceId" = $2::uuid, false)
		FROM core.workflow c WHERE c."workspaceId" = $1 AND `+predicate, workspaceID(), reader.param(), arg).
		Scan(&access.id, &access.workspaceWorkflowID, &access.accessible)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("select workflow access: %w", err)
	}
	return &access, nil
}

func (s *Store) versionsOf(ctx context.Context, access workflowAccess) ([]CoreVersion, error) {
	rows, err := s.versionRows(ctx, []string{access.id})
	if err != nil {
		return nil, err
	}
	return withoutContent(rows, access.workspaceWorkflowID), nil
}

func (s *Store) CoreVersionsByWorkflowID(ctx context.Context, reader Reader, coreWorkflowID string) ([]CoreVersion, error) {
	access, err := s.workflowAccess(ctx, reader, `c.id = $3::uuid`, coreWorkflowID)
	if err != nil || access == nil {
		return []CoreVersion{}, err
	}
	if !access.accessible {
		return nil, ErrForbidden
	}
	return s.versionsOf(ctx, *access)
}

func (s *Store) CoreVersionsByWorkspaceWorkflowID(ctx context.Context, reader Reader, workspaceWorkflowID string) ([]CoreVersion, error) {
	access, err := s.workflowAccess(ctx, reader, `c."workspaceWorkflowId" = $3::uuid`, workspaceWorkflowID)
	if err != nil || access == nil || !access.accessible {
		return []CoreVersion{}, err
	}
	return s.versionsOf(ctx, *access)
}

func (s *Store) CoreVersion(ctx context.Context, reader Reader, id string) (*CoreVersion, error) {
	return s.coreVersionWhere(ctx, reader, `v.id = $3::uuid`, id)
}

func (s *Store) CoreVersionByWorkspaceVersionID(ctx context.Context, reader Reader, workspaceVersionID string) (*CoreVersion, error) {
	return s.coreVersionWhere(ctx, reader, `v."workspaceWorkflowVersionId" = $3::uuid`, workspaceVersionID)
}

func (s *Store) coreVersionWhere(ctx context.Context, reader Reader, predicate, arg string) (*CoreVersion, error) {
	var (
		row                 versionRow
		position            int
		workspaceWorkflowID *string
		accessible          bool
	)
	err := s.pool.QueryRow(ctx, `SELECT v.id::text, v."coreWorkflowId"::text, v.status::text, v."workspaceWorkflowVersionId"::text,
			v."createdAt", v."updatedAt", v.triggers, v.steps,
			(SELECT count(*) FROM core."workflowVersion" sibling WHERE sibling."coreWorkflowId" = v."coreWorkflowId"
				AND sibling."workspaceId" = $1 AND (sibling."createdAt", sibling.id) <= (v."createdAt", v.id)),
			c."workspaceWorkflowId"::text,
			c.id IS NULL OR coalesce(c.visibility <> 'PRIVATE' OR c."createdByUserWorkspaceId" IS NULL OR c."createdByUserWorkspaceId" = $2::uuid, false)
		FROM core."workflowVersion" v LEFT JOIN core.workflow c ON c.id = v."coreWorkflowId"
		WHERE v."workspaceId" = $1 AND `+predicate, workspaceID(), reader.param(), arg).
		Scan(&row.ID, &row.CoreWorkflowID, &row.Status, &row.WorkspaceWorkflowVersionID, &row.createdAt, &row.updatedAt, &row.triggers, &row.steps,
			&position, &workspaceWorkflowID, &accessible)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("select core version: %w", err)
	}
	if row.CoreWorkflowID == nil {
		return nil, nil
	}
	if !accessible {
		return nil, ErrForbidden
	}
	version := row.CoreVersion
	version.CreatedAt, version.UpdatedAt = formatTime(row.createdAt), formatTime(row.updatedAt)
	version.Label, version.WorkspaceWorkflowID = versionLabel(position), workspaceWorkflowID
	version.Trigger, version.Steps = firstTrigger(row.triggers), row.steps
	return &version, nil
}
