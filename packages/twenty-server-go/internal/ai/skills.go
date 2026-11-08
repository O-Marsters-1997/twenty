package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

// ErrSkillStandard is returned when a caller edits or deletes a standard skill.
var ErrSkillStandard = errors.New("standard skills cannot be modified")

const (
	uniqueViolation = "23505"
	skillSelect     = `SELECT to_jsonb(s) FROM core.skill s`
)

// SkillRecord is a Skill with the columns the GraphQL API exposes.
type SkillRecord struct {
	Skill
	Icon          *string
	Description   *string
	IsCustom      bool
	IsSystem      bool
	IsActive      bool
	ApplicationID *string
	CreatedAt     metadata.Timestamp
	UpdatedAt     metadata.Timestamp
}

// SkillInput creates a skill; ID, Icon and Description are optional.
type SkillInput struct {
	ID                   *string
	Name, Label, Content string
	Icon, Description    *string
}

// SkillPatch updates a custom skill; nil fields are left unchanged.
type SkillPatch struct {
	ID                                      string
	Name, Label, Icon, Description, Content *string
	IsActive                                *bool
}

// Skills stores the workspace's skills in Postgres.
type Skills struct{ pool *pgxpool.Pool }

func NewSkills(pool *pgxpool.Pool) *Skills { return &Skills{pool: pool} }

func (s *Skills) List(ctx context.Context) ([]SkillRecord, error) {
	return querySkills(ctx, s.pool, skillSelect+` ORDER BY s.label, s.id`)
}

func (s *Skills) Get(ctx context.Context, id string) (SkillRecord, error) {
	return oneSkill(ctx, s.pool, skillSelect+` WHERE s.id = $1::uuid`, id)
}

func (s *Skills) Create(ctx context.Context, input SkillInput) (SkillRecord, error) {
	name, label := collapseSpace(input.Name), collapseSpace(input.Label)
	content := strings.TrimSpace(input.Content)
	if name == "" || label == "" || content == "" {
		return SkillRecord{}, fmt.Errorf("%w: name, label and content are required", metadata.ErrInvalidInput)
	}
	record, err := oneSkill(ctx, s.pool, `INSERT INTO core.skill AS s
		(id, name, label, icon, description, content, "isCustom", "isSystem", "isActive", "universalIdentifier", "workspaceId", "applicationId")
		VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, true, false, true, gen_random_uuid(), $7::uuid,
			(SELECT "workspaceCustomApplicationId" FROM core.workspace WHERE id = $7::uuid))
		RETURNING to_jsonb(s)`,
		input.ID, name, label, collapsed(input.Icon), collapsed(input.Description), content, workspace.PinnedWorkspaceID)
	return record, skillConflict(err)
}

func (s *Skills) Update(ctx context.Context, patch SkillPatch) (SkillRecord, error) {
	record, err := oneSkill(ctx, s.pool, `UPDATE core.skill AS s SET
		name = COALESCE($2, name), label = COALESCE($3, label), icon = COALESCE($4, icon),
		description = COALESCE($5, description), content = COALESCE($6, content),
		"isActive" = COALESCE($7, "isActive"), "updatedAt" = now()
		WHERE s.id = $1::uuid AND s."isCustom" RETURNING to_jsonb(s)`,
		patch.ID, collapsed(patch.Name), collapsed(patch.Label), collapsed(patch.Icon), collapsed(patch.Description),
		trimmed(patch.Content), patch.IsActive)
	return s.explainMiss(ctx, patch.ID, record, skillConflict(err))
}

func (s *Skills) Delete(ctx context.Context, id string) (SkillRecord, error) {
	record, err := oneSkill(ctx, s.pool, `DELETE FROM core.skill AS s WHERE s.id = $1::uuid AND s."isCustom" RETURNING to_jsonb(s)`, id)
	return s.explainMiss(ctx, id, record, err)
}

// SetActive works on standard skills too.
func (s *Skills) SetActive(ctx context.Context, id string, active bool) (SkillRecord, error) {
	return oneSkill(ctx, s.pool, `UPDATE core.skill AS s SET "isActive" = $2, "updatedAt" = now() WHERE s.id = $1::uuid RETURNING to_jsonb(s)`, id, active)
}

// Resolve returns the active skills among ids.
func (s *Skills) Resolve(ctx context.Context, ids []string) ([]Skill, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	records, err := querySkills(ctx, s.pool, skillSelect+` WHERE s.id = ANY($1::uuid[]) AND s."isActive" ORDER BY s.label, s.id`, ids)
	if err != nil {
		return nil, err
	}
	skills := make([]Skill, len(records))
	for i, record := range records {
		skills[i] = record.Skill
	}
	return skills, nil
}

func (s *Skills) explainMiss(ctx context.Context, id string, record SkillRecord, err error) (SkillRecord, error) {
	if !errors.Is(err, metadata.ErrNotFound) {
		return record, err
	}
	if _, getErr := s.Get(ctx, id); getErr != nil {
		return SkillRecord{}, getErr
	}
	return SkillRecord{}, ErrSkillStandard
}

func skillConflict(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return fmt.Errorf("%w: a skill with this name already exists", metadata.ErrInvalidInput)
	}
	return err
}

func querySkills(ctx context.Context, pool *pgxpool.Pool, statement string, args ...any) ([]SkillRecord, error) {
	rows, err := pool.Query(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("query skills: %w", err)
	}
	documents, err := pgx.CollectRows(rows, pgx.RowTo[[]byte])
	if err != nil {
		return nil, fmt.Errorf("read skills: %w", err)
	}
	records := make([]SkillRecord, len(documents))
	for i, document := range documents {
		if err := json.Unmarshal(document, &records[i]); err != nil {
			return nil, fmt.Errorf("decode skill: %w", err)
		}
	}
	return records, nil
}

func oneSkill(ctx context.Context, pool *pgxpool.Pool, statement string, args ...any) (SkillRecord, error) {
	records, err := querySkills(ctx, pool, statement, args...)
	switch {
	case err != nil:
		return SkillRecord{}, err
	case len(records) == 0:
		return SkillRecord{}, metadata.ErrNotFound
	}
	return records[0], nil
}

func collapseSpace(text string) string {
	return strings.Join(strings.Fields(text), " ")
}

func collapsed(text *string) *string {
	if text == nil {
		return nil
	}
	result := collapseSpace(*text)
	return &result
}

func trimmed(text *string) *string {
	if text == nil {
		return nil
	}
	result := strings.TrimSpace(*text)
	return &result
}
