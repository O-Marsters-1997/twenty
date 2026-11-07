# Database migrations

Only goose migrations in `packages/twenty-server-go/internal/migrations/sql` change the schema.
Node's TypeORM migrations and upgrade commands no longer run at server start or from `database:init`
and `database:reset`. `00001_baseline.sql` is the squashed `core` and workspace schema plus the seed
rows for the pinned workspace (`internal/workspace.PinnedWorkspaceID`).

```bash
cd packages/twenty-server-go
PG_DATABASE_URL=postgres://postgres:postgres@localhost:5432/default go run ./cmd/migrate up      # also: down, status
```

## Adding a field

Add one file, `NNNNN_add_<field>.sql`, with the next number. It does all three things in one transaction:

1. Add the columns to the workspace table in schema `workspace_2abogkkt2zd45pa9aun09djpf`
   (`workspace.SchemaName()`).
2. Insert the matching `core."fieldMetadata"` row (and `core."viewField"` rows for any view that should
   show it) with the pinned workspace's `workspaceId`, the object's `objectMetadataId` and the
   application's `applicationId`. Copy a similar field's row from the baseline.
3. Write the `down` section that reverses both.

```sql
-- +goose Up
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf.person ADD COLUMN nickname text;
INSERT INTO core."fieldMetadata" (...) SELECT ... FROM core."objectMetadata" WHERE "nameSingular" = 'person';

-- +goose Down
DELETE FROM core."fieldMetadata" WHERE name = 'nickname' AND "objectMetadataId" IN (...);
ALTER TABLE workspace_2abogkkt2zd45pa9aun09djpf.person DROP COLUMN nickname;
```

After the migration, flush Node's metadata cache until Node is removed:
`npx nx command-no-deps twenty-server -- cache:flush`.
