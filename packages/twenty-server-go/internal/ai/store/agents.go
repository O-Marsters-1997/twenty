package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	uniqueViolation = "23505"
	selectAgents    = `SELECT to_jsonb(a) || jsonb_build_object('roleId', rt."roleId")
		FROM core.agent a LEFT JOIN core."roleTarget" rt ON rt."agentId" = a.id
		WHERE a."workspaceId" = $1::uuid AND a."deletedAt" IS NULL`
)

var (
	textFields = []string{"name", "label", "icon", "description", "prompt", "modelId"}
	jsonFields = []string{"responseFormat", "modelConfiguration", "triggers"}
)

type db interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Agents reads and writes the workspace's agents and their role assignment.
type Agents struct {
	pool *pgxpool.Pool
}

func NewAgents(pool *pgxpool.Pool) *Agents {
	return &Agents{pool: pool}
}

func (a *Agents) List(ctx context.Context) ([]ai.AgentRecord, error) {
	return queryAgents(ctx, a.pool, selectAgents+` ORDER BY a."createdAt", a.id`, workspace.PinnedWorkspaceID)
}

func (a *Agents) Get(ctx context.Context, id string) (ai.AgentRecord, error) {
	return getAgent(ctx, a.pool, id)
}

// Create inserts a custom agent; label is required and name defaults to the camel-cased label.
func (a *Agents) Create(ctx context.Context, input map[string]any) (ai.AgentRecord, error) {
	values := normalise(input)
	label, _ := values["label"].(string)
	if label == "" {
		return ai.AgentRecord{}, fmt.Errorf("%w: label is required", metadata.ErrInvalidInput)
	}
	if values["name"] == nil {
		values["name"] = nameFromLabel(label)
	}
	if values["name"] == "" {
		return ai.AgentRecord{}, fmt.Errorf("%w: label must contain letters or digits", metadata.ErrInvalidInput)
	}
	if values["prompt"] == nil || values["modelId"] == nil {
		return ai.AgentRecord{}, fmt.Errorf("%w: prompt and modelId are required", metadata.ErrInvalidInput)
	}
	var created ai.AgentRecord
	err := pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		var id string
		rows, err := tx.Query(ctx, `INSERT INTO core.agent (name, label, icon, description, prompt, "modelId", "responseFormat", "modelConfiguration", triggers, "isCustom", "universalIdentifier", "workspaceId", "applicationId")
			VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::jsonb, '{"type": "text"}'), $8::jsonb, COALESCE($9::jsonb, '[]'), true, gen_random_uuid(), $10::uuid,
				(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $10::uuid))
			RETURNING id::text`,
			values["name"], values["label"], values["icon"], values["description"], values["prompt"], values["modelId"],
			values["responseFormat"], values["modelConfiguration"], values["triggers"], workspace.PinnedWorkspaceID)
		if err != nil {
			return writeError(err)
		}
		if id, err = pgx.CollectOneRow(rows, pgx.RowTo[string]); err != nil {
			return writeError(err)
		}
		if roleID, ok := values["roleId"].(string); ok {
			if err := setRole(ctx, tx, id, roleID); err != nil {
				return err
			}
		}
		created, err = getAgent(ctx, tx, id)
		return err
	})
	return created, err
}

// Update changes only the keys present in input; a null roleId removes the agent's role.
func (a *Agents) Update(ctx context.Context, id string, input map[string]any) (ai.AgentRecord, error) {
	values := normalise(input)
	var updated ai.AgentRecord
	err := pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		if _, err := getAgent(ctx, tx, id); err != nil {
			return err
		}
		if label, ok := values["label"].(string); ok && values["name"] == nil {
			values["name"] = nameFromLabel(label)
		}
		sets, args := []string{`"updatedAt" = now()`}, []any{id, workspace.PinnedWorkspaceID}
		for _, column := range append(append([]string(nil), textFields...), jsonFields...) {
			value, ok := values[column]
			if !ok || value == nil {
				continue
			}
			args = append(args, value)
			cast := ""
			if slices.Contains(jsonFields, column) {
				cast = "::jsonb"
			}
			sets = append(sets, fmt.Sprintf("%s = $%d%s", pgx.Identifier{column}.Sanitize(), len(args), cast))
		}
		if _, err := tx.Exec(ctx, `UPDATE core.agent SET `+strings.Join(sets, ", ")+` WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, args...); err != nil {
			return writeError(err)
		}
		if err := updateRole(ctx, tx, id, values); err != nil {
			return err
		}
		var err error
		updated, err = getAgent(ctx, tx, id)
		return err
	})
	return updated, err
}

// Delete removes the agent and, through the foreign key, its role assignment.
func (a *Agents) Delete(ctx context.Context, id string) (ai.AgentRecord, error) {
	var deleted ai.AgentRecord
	err := pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		var err error
		if deleted, err = getAgent(ctx, tx, id); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `DELETE FROM core.agent WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, id, workspace.PinnedWorkspaceID)
		return err
	})
	return deleted, err
}

// AssignRole gives the agent the role, replacing any role it had.
func (a *Agents) AssignRole(ctx context.Context, agentID, roleID string) error {
	return pgx.BeginFunc(ctx, a.pool, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT 1 FROM core.agent WHERE id = $1::uuid AND "workspaceId" = $2::uuid AND "deletedAt" IS NULL`, agentID, workspace.PinnedWorkspaceID)
		if err != nil {
			return fmt.Errorf("find agent: %w", err)
		}
		found, err := pgx.CollectRows(rows, pgx.RowTo[int])
		if err != nil {
			return fmt.Errorf("find agent: %w", err)
		}
		if len(found) == 0 {
			return fmt.Errorf("%w: Agent with id %s not found in workspace", metadata.ErrNotFound, agentID)
		}
		return setRole(ctx, tx, agentID, roleID)
	})
}

func updateRole(ctx context.Context, tx pgx.Tx, agentID string, input map[string]any) error {
	value, present := input["roleId"]
	switch roleID := value.(type) {
	case string:
		return setRole(ctx, tx, agentID, roleID)
	case nil:
		if present {
			_, err := tx.Exec(ctx, `DELETE FROM core."roleTarget" WHERE "agentId" = $1::uuid`, agentID)
			return err
		}
	}
	return nil
}

func setRole(ctx context.Context, tx pgx.Tx, agentID, roleID string) error {
	rows, err := tx.Query(ctx, `SELECT "canBeAssignedToAgents", label FROM core.role WHERE id = $1::uuid AND "workspaceId" = $2::uuid`, roleID, workspace.PinnedWorkspaceID)
	if err != nil {
		return fmt.Errorf("find role: %w", err)
	}
	type role struct {
		Assignable bool
		Label      string
	}
	roles, err := pgx.CollectRows(rows, pgx.RowToStructByPos[role])
	if err != nil {
		return fmt.Errorf("find role: %w", err)
	}
	switch {
	case len(roles) == 0:
		return fmt.Errorf("%w: Role with id %s not found in workspace", metadata.ErrNotFound, roleID)
	case !roles[0].Assignable:
		return fmt.Errorf("%w: Role %q cannot be assigned to agents", ai.ErrForbidden, roles[0].Label)
	}
	tag, err := tx.Exec(ctx, `UPDATE core."roleTarget" SET "roleId" = $2::uuid, "updatedAt" = now() WHERE "agentId" = $1::uuid`, agentID, roleID)
	if err != nil || tag.RowsAffected() > 0 {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO core."roleTarget" ("roleId", "agentId", "universalIdentifier", "workspaceId", "applicationId")
		VALUES ($1::uuid, $2::uuid, gen_random_uuid(), $3::uuid, (SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $3::uuid))`,
		roleID, agentID, workspace.PinnedWorkspaceID)
	return err
}

func getAgent(ctx context.Context, db db, id string) (ai.AgentRecord, error) {
	found, err := queryAgents(ctx, db, selectAgents+` AND a.id = $2::uuid`, workspace.PinnedWorkspaceID, id)
	switch {
	case err != nil:
		return ai.AgentRecord{}, err
	case len(found) == 0:
		return ai.AgentRecord{}, fmt.Errorf("%w: Agent not found", metadata.ErrNotFound)
	}
	return found[0], nil
}

func queryAgents(ctx context.Context, db db, statement string, args ...any) ([]ai.AgentRecord, error) {
	rows, err := db.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query agents: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read agents: %w", err)
	}
	agents := make([]ai.AgentRecord, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &agents[i]); err != nil {
			return nil, fmt.Errorf("decode agent: %w", err)
		}
	}
	return agents, nil
}

func writeError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return fmt.Errorf("%w: an agent with this name already exists", metadata.ErrInvalidInput)
	}
	return fmt.Errorf("write agent: %w", err)
}

// normalise trims and collapses whitespace in text fields, as Node does, and JSON-encodes the jsonb fields.
func normalise(input map[string]any) map[string]any {
	values := make(map[string]any, len(input))
	for key, value := range input {
		if text, ok := value.(*string); ok { // gqlgen decodes nullable scalars to *string
			if text == nil {
				value = nil
			} else {
				value = *text
			}
		}
		values[key] = value
	}
	for _, field := range textFields {
		if text, ok := values[field].(string); ok {
			values[field] = strings.Join(strings.Fields(text), " ")
		}
	}
	for _, field := range jsonFields {
		if value, ok := values[field]; ok && value != nil {
			encoded, _ := json.Marshal(value)
			values[field] = string(encoded)
		}
	}
	return values
}

func nameFromLabel(label string) string {
	var name strings.Builder
	for i, word := range strings.FieldsFunc(label, func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) }) {
		runes := []rune(strings.ToLower(word))
		if i > 0 {
			runes[0] = unicode.ToUpper(runes[0])
		}
		name.WriteString(string(runes))
	}
	return name.String()
}
