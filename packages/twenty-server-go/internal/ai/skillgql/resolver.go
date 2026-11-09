package skillgql

import (
	"context"
	"errors"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/ai"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

type Resolver struct{ Store *ai.Skills }

func (r *mutationResolver) CreateSkill(ctx context.Context, input ai.SkillInput) (*ai.SkillRecord, error) {
	return pointer(r.Store.Create(ctx, input))
}

func (r *mutationResolver) UpdateSkill(ctx context.Context, input ai.SkillPatch) (*ai.SkillRecord, error) {
	return pointer(r.Store.Update(ctx, input))
}

func (r *mutationResolver) DeleteSkill(ctx context.Context, id string) (*ai.SkillRecord, error) {
	return pointer(r.Store.Delete(ctx, id))
}

func (r *mutationResolver) ActivateSkill(ctx context.Context, id string) (*ai.SkillRecord, error) {
	return pointer(r.Store.SetActive(ctx, id, true))
}

func (r *mutationResolver) DeactivateSkill(ctx context.Context, id string) (*ai.SkillRecord, error) {
	return pointer(r.Store.SetActive(ctx, id, false))
}

func (r *queryResolver) Skills(ctx context.Context) ([]*ai.SkillRecord, error) {
	skills, err := r.Store.List(ctx)
	if err != nil {
		return nil, err
	}
	pointers := make([]*ai.SkillRecord, len(skills))
	for i := range skills {
		pointers[i] = &skills[i]
	}
	return pointers, nil
}

func (r *queryResolver) Skill(ctx context.Context, id string) (*ai.SkillRecord, error) {
	skill, err := r.Store.Get(ctx, id)
	if errors.Is(err, metadata.ErrNotFound) {
		return nil, nil
	}
	return pointer(skill, err)
}

func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

type (
	mutationResolver struct{ *Resolver }
	queryResolver    struct{ *Resolver }
)

func pointer(skill ai.SkillRecord, err error) (*ai.SkillRecord, error) {
	if err != nil {
		return nil, err
	}
	return &skill, nil
}
