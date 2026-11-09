package ai_test

import (
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

const standardSkillID = "4435a312-b1a8-4103-9111-52cce3b7834e"

func newSkills(t *testing.T) *ai.Skills {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return ai.NewSkills(pool)
}

func strPtr(text string) *string { return &text }

func TestSkills_Lifecycle(t *testing.T) {
	t.Parallel()
	skills := newSkills(t)

	created, err := skills.Create(t.Context(), ai.SkillInput{Name: "  cold  outreach ", Label: "Cold Outreach", Content: "\n# Steps\n\n1. Write\n", Icon: strPtr("IconMail")})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	want := ai.Skill{ID: created.ID, Name: "cold outreach", Label: "Cold Outreach", Content: "# Steps\n\n1. Write"}
	if diff := cmp.Diff(want, created.Skill); diff != "" {
		t.Errorf("Create() skill (-want +got):\n%s", diff)
	}
	if !created.IsCustom || created.IsSystem || !created.IsActive || created.ApplicationID == nil {
		t.Errorf("Create() flags = custom %v system %v active %v application %v, want custom, active, in the custom application",
			created.IsCustom, created.IsSystem, created.IsActive, created.ApplicationID)
	}

	updated, err := skills.Update(t.Context(), ai.SkillPatch{ID: created.ID, Label: strPtr("Outreach")})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Label != "Outreach" || updated.Content != created.Content || !updated.UpdatedAt.After(created.UpdatedAt.Time) {
		t.Errorf("Update() = %+v, want only the label changed and updatedAt advanced", updated)
	}

	deactivated, err := skills.SetActive(t.Context(), created.ID, false)
	if err != nil || deactivated.IsActive {
		t.Fatalf("SetActive(false) = %+v, %v, want inactive", deactivated, err)
	}
	activated, err := skills.SetActive(t.Context(), created.ID, true)
	if err != nil || !activated.IsActive {
		t.Fatalf("SetActive(true) = %+v, %v, want active", activated, err)
	}

	if _, err := skills.Delete(t.Context(), created.ID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, err := skills.Get(t.Context(), created.ID); !errors.Is(err, metadata.ErrNotFound) {
		t.Errorf("Get() after Delete() error = %v, want %v", err, metadata.ErrNotFound)
	}
}

func TestSkills_Errors(t *testing.T) {
	t.Parallel()
	skills := newSkills(t)
	if _, err := skills.Create(t.Context(), ai.SkillInput{Name: "dup", Label: "Dup", Content: "x"}); err != nil {
		t.Fatal(err)
	}
	missing := "00000000-0000-4000-8000-000000000000"

	tests := []struct {
		name string
		call func() error
		want error
	}{
		{"create without content", func() error {
			_, err := skills.Create(t.Context(), ai.SkillInput{Name: "a", Label: "A", Content: " "})
			return err
		}, metadata.ErrInvalidInput},
		{"create with an active name", func() error {
			_, err := skills.Create(t.Context(), ai.SkillInput{Name: "dup", Label: "Other", Content: "x"})
			return err
		}, metadata.ErrInvalidInput},
		{"update a standard skill", func() error {
			_, err := skills.Update(t.Context(), ai.SkillPatch{ID: standardSkillID, Label: strPtr("x")})
			return err
		}, ai.ErrSkillStandard},
		{"delete a standard skill", func() error {
			_, err := skills.Delete(t.Context(), standardSkillID)
			return err
		}, ai.ErrSkillStandard},
		{"update a missing skill", func() error {
			_, err := skills.Update(t.Context(), ai.SkillPatch{ID: missing, Label: strPtr("x")})
			return err
		}, metadata.ErrNotFound},
		{"delete a missing skill", func() error {
			_, err := skills.Delete(t.Context(), missing)
			return err
		}, metadata.ErrNotFound},
		{"activate a missing skill", func() error {
			_, err := skills.SetActive(t.Context(), missing, true)
			return err
		}, metadata.ErrNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.call(); !errors.Is(err, tt.want) {
				t.Errorf("error = %v, want %v", err, tt.want)
			}
		})
	}

	if deactivated, err := skills.SetActive(t.Context(), standardSkillID, false); err != nil || deactivated.IsActive {
		t.Errorf("SetActive(standard, false) = %+v, %v, want a standard skill to be deactivatable", deactivated, err)
	}
}

func TestSkills_Resolve(t *testing.T) {
	t.Parallel()
	skills := newSkills(t)
	active, err := skills.Create(t.Context(), ai.SkillInput{Name: "active", Label: "Active", Content: "active content"})
	if err != nil {
		t.Fatal(err)
	}
	inactive, err := skills.Create(t.Context(), ai.SkillInput{Name: "inactive", Label: "Inactive", Content: "inactive content"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := skills.SetActive(t.Context(), inactive.ID, false); err != nil {
		t.Fatal(err)
	}

	got, err := skills.Resolve(t.Context(), []string{active.ID, inactive.ID})
	if err != nil {
		t.Fatalf("Resolve() error = %v", err)
	}
	want := []ai.Skill{{ID: active.ID, Name: "active", Label: "Active", Content: "active content"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Resolve() (-want +got):\n%s", diff)
	}
	if none, err := skills.Resolve(t.Context(), nil); err != nil || len(none) != 0 {
		t.Errorf("Resolve(nil) = %v, %v, want nothing", none, err)
	}
}
