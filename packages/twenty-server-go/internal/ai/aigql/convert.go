package aigql

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
)

var errNoMember = errors.New("the request has no workspace member")

func principalWithMember(ctx context.Context) (auth.Principal, error) {
	principal, ok := auth.PrincipalFrom(ctx)
	if !ok || principal.WorkspaceMemberID == "" {
		return auth.Principal{}, errNoMember
	}
	return principal, nil
}

func memberFrom(ctx context.Context) (string, error) {
	principal, err := principalWithMember(ctx)
	return principal.WorkspaceMemberID, err
}

func convert[TModel any](value any) (*TModel, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode %T: %w", value, err)
	}
	var model TModel
	if err := json.Unmarshal(encoded, &model); err != nil {
		return nil, fmt.Errorf("decode %T: %w", model, err)
	}
	return &model, nil
}

func convertAll[TModel any, TValue any](values []TValue) ([]*TModel, error) {
	models := make([]*TModel, len(values))
	for i, value := range values {
		model, err := convert[TModel](value)
		if err != nil {
			return nil, err
		}
		models[i] = model
	}
	return models, nil
}
