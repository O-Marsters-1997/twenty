// Package modelgen derives the object model, the GraphQL SDL and the sqlc
// queries from the metadata of a migrated database.
package modelgen

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Generate returns the generated files keyed by path relative to the module root.
func Generate(ctx context.Context, pool *pgxpool.Pool, workspaceID, schema string) (map[string][]byte, error) {
	objects, err := load(ctx, pool, workspaceID, schema)
	if err != nil {
		return nil, err
	}
	files := map[string][]byte{}
	if files["internal/model/objects_gen.go"], err = goSource(objects); err != nil {
		return nil, err
	}
	if files["internal/records/schema.graphqls"], err = sdl(objects); err != nil {
		return nil, fmt.Errorf("build schema: %w", err)
	}
	for _, o := range objects {
		files["internal/records/store/queries/"+o.NameSingular+".sql"] = querySQL(o, schema)
	}
	return files, nil
}
