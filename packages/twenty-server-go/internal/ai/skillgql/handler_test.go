package skillgql_test

import (
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai/skillgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const (
	alphaID = "11111111-1111-4111-8111-111111111111"
	betaID  = "22222222-2222-4222-8222-222222222222"
)

func strPtr(text string) *string { return &text }

func TestHandler_MatchesGolden(t *testing.T) {
	t.Parallel()
	volatile := func(path string) []string {
		return []string{path + ".applicationId", path + ".createdAt", path + ".updatedAt"}
	}
	tests := []struct {
		name   string
		setup  func(t *testing.T, skills *ai.Skills)
		ignore []string
	}{
		{name: "find-many-skills", ignore: volatile("data.skills.*")},
		{name: "find-one-skill", ignore: volatile("data.skill")},
		{name: "find-many-skills-for-suggestion"},
		{name: "create-skill", ignore: volatile("data.createSkill")},
		{name: "update-skill", ignore: volatile("data.updateSkill")},
		{name: "delete-skill", ignore: volatile("data.deleteSkill")},
		{name: "activate-skill", ignore: volatile("data.activateSkill"), setup: func(t *testing.T, skills *ai.Skills) {
			if _, err := skills.SetActive(t.Context(), betaID, false); err != nil {
				t.Fatal(err)
			}
		}},
		{name: "deactivate-skill", ignore: volatile("data.deactivateSkill")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			pool, err := pgxpool.New(t.Context(), pgtest.New(t))
			if err != nil {
				t.Fatalf("connect: %v", err)
			}
			t.Cleanup(pool.Close)
			if _, err := pool.Exec(t.Context(), `DELETE FROM core.skill`); err != nil {
				t.Fatalf("clear seeded skills: %v", err)
			}
			skills := ai.NewSkills(pool)
			for _, input := range []ai.SkillInput{
				{ID: strPtr(alphaID), Name: "alpha", Label: "Alpha Skill", Content: "alpha content", Icon: strPtr("IconA"), Description: strPtr("First")},
				{ID: strPtr(betaID), Name: "beta", Label: "Beta Skill", Content: "beta content"},
			} {
				if _, err := skills.Create(t.Context(), input); err != nil {
					t.Fatalf("seed %s: %v", *input.ID, err)
				}
			}
			if tt.setup != nil {
				tt.setup(t, skills)
			}
			handler := skillgql.NewHandler(skills, slog.New(slog.NewTextHandler(io.Discard, nil)))
			golden.Assert(t, handler, "testdata/golden", tt.name, tt.ignore...)
		})
	}
}
