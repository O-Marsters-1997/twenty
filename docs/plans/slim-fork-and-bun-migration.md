# Plan: Slim fork and Bun migration

> Source: docs/prds/slim-fork-and-bun-migration.md
> Label: project:slim-fork-and-bun-migration
> Feature branch: feature/slim-fork-and-bun-migration

The fork drops Twenty's third-party app platform, leaving a core `application` that only owns standard and custom metadata, then moves the monorepo from Yarn 4 to Bun with Node as the runtime. Phase 2 work lives in `twenty-server` (`engine/core-modules/application`, `engine/metadata-modules`, `modules/workflow`), `twenty-front` and `twenty-shared`. Phase 3 work lives in root config, `.github` and `packages/twenty-docker`.

Definitions are frozen once tickets are cut: changing one is a `contract-change` issue that blocks dependent work, never a quiet edit.

## Phases

1. [Remove app developer tooling](#phase-1-remove-app-developer-tooling)
2. [Remove the app platform](#phase-2-remove-the-app-platform)
3. [Migrate to Bun](#phase-3-migrate-to-bun)

## Phase 1: Remove app developer tooling

Journeys: J1, J2

**Glossary**

- **Removed package**: one of `twenty-cli`, `create-twenty-app`, `twenty-apps`, `twenty-agent-skills`, `twenty-claude-skills`, `twenty-companion`, `twenty-zapier`. Deleted with its CI workflows, the `deploy-`, `install-`, `test-twenty-app` and `spawn-twenty-app-dev-test` actions, and verdaccio publishing.
- **Recovery record**: `docs/removed-app-platform.md`, one row per removed package or module, pinned to the last commit that contained it. Phase 2 appends its rows.

**New**

```markdown
<!-- docs/removed-app-platform.md -->
# Removed app platform

| Name | Paths | Last commit | Restore | Also needs |
| ---- | ----- | ----------- | ------- | ---------- |
| <package or module> | <paths> | <sha> | `git checkout <sha> -- <paths>` | <other rows it depends on> |
```

**Modified**

```json
// package.json
{
  "workspaces": {
    "packages": [
      "packages/twenty-front",
      "packages/twenty-server",
      "packages/twenty-emails",
      "packages/twenty-ui",
      "packages/twenty-utils",
      "packages/twenty-website",
      "packages/twenty-docs",
      "packages/twenty-e2e-testing",
      "packages/twenty-shared",
      "packages/twenty-sdk",
      "packages/twenty-front-component-renderer",
      "packages/twenty-client-sdk",
      "packages/twenty-oxlint-rules"
    ]
  }
}
```

## Phase 2: Remove the app platform

Journeys: J3, J4, J5, J6

**Glossary**

- **Core application**: the `application` row that owns metadata: the Twenty standard application and the workspace custom application. It can't be installed, upgraded or uninstalled.
- **Dropped tables** (core schema): `logicFunction`, `logicFunctionLayer`, `frontComponent`, `settingsMenuItem`, `applicationVariable`, `userApplicationVariableValue`, `connectionProvider`, `applicationRegistration`, `applicationRegistrationVariable`, `applicationAuthorization`, `applicationTranslation`.
- **Removed packages**: `twenty-sdk`, `twenty-client-sdk` and `twenty-front-component-renderer` leave `workspaces` once nothing imports them.

**New**

```ts
// packages/twenty-server/src/database/commands/upgrade-version-command/2-48/2-48-instance-command-<epoch-ms>-drop-app-platform.command.ts
export class DropAppPlatformFastInstanceCommand implements FastInstanceCommand {
  up(queryRunner: QueryRunner): Promise<void>;
  down(queryRunner: QueryRunner): Promise<void>;
}
```

**Modified**

```ts
// packages/twenty-server/src/engine/core-modules/application/application.entity.ts
@Entity({ name: 'application', schema: 'core' })
export class ApplicationEntity extends WorkspaceRelatedEntity {
  id: string;
  universalIdentifier: string;
  name: string;
  description: string | null;
  logo: string | null;
  logoFileId: string | null;
  version: string | null;
  defaultRoleId: string | null;
  primaryPublicDomainId: string | null;
  publicDomains: Relation<PublicDomainEntity[]>;
  agents: Relation<AgentEntity[]>;
  objects: Relation<ObjectMetadataEntity[]>;
  commandMenuItems: Relation<CommandMenuItemEntity[]>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

```ts
// packages/twenty-shared/src/metadata/constants/all-metadata-name.constant.ts
// ALL_METADATA_NAME and ALL_METADATA_ENTITY_BY_METADATA_NAME hold no
// frontComponent, logicFunction, applicationVariable, connectionProvider or settingsMenuItem.
```

```ts
// packages/twenty-server/src/engine/metadata-modules/command-menu-item/entities/command-menu-item.entity.ts
export class CommandMenuItemEntity extends SyncableEntity {
  workflowVersionId: string | null;
  coreWorkflowVersionId: string | null;
  engineComponentKey: EngineComponentKey;
  // remaining display and availability columns unchanged; no frontComponentId
}
```

```ts
// packages/twenty-server/src/engine/metadata-modules/connected-account/entities/connected-account.entity.ts
export class ConnectedAccountEntity {
  provider: ConnectedAccountProvider;
  // remaining columns unchanged; no connectionProviderId
}
```

```ts
// packages/twenty-shared/src/workflow/types/WorkflowActionType.ts
export enum WorkflowActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_CHAT_MESSAGE = 'SEND_CHAT_MESSAGE',
  DRAFT_EMAIL = 'DRAFT_EMAIL',
  CREATE_CALENDAR_EVENT = 'CREATE_CALENDAR_EVENT',
  CREATE_RECORD = 'CREATE_RECORD',
  UPDATE_RECORD = 'UPDATE_RECORD',
  DELETE_RECORD = 'DELETE_RECORD',
  UPSERT_RECORD = 'UPSERT_RECORD',
  FIND_RECORDS = 'FIND_RECORDS',
  PICK_RECORD = 'PICK_RECORD',
  FORM = 'FORM',
  FILTER = 'FILTER',
  IF_ELSE = 'IF_ELSE',
  HTTP_REQUEST = 'HTTP_REQUEST',
  AI_AGENT = 'AI_AGENT',
  CLASSIFY = 'CLASSIFY',
  ITERATOR = 'ITERATOR',
  EMPTY = 'EMPTY',
  DELAY = 'DELAY',
  WAIT_FOR_EVENT = 'WAIT_FOR_EVENT',
}
```

```ts
// packages/twenty-shared/src/types/page-layout/WidgetType.ts
// WidgetType has no FRONT_COMPONENT; PageLayoutWidgetConfiguration has no 'FRONT_COMPONENT' member.
```

```ts
// packages/twenty-server/src/engine/core-modules/tool-provider/types/tool-execution-ref.type.ts
export type ToolExecutionRef =
  | {
      kind: 'database_crud';
      objectNameSingular: string;
      operation: DatabaseCrudOperation;
    }
  | { kind: 'static'; toolId: string };
```

## Phase 3: Migrate to Bun

Journeys: J7, J8, J9, J10

**Glossary**

- **Supply-chain guards**: the Bun equivalents of Yarn's `enableScripts: false`, `npmMinimalAgeGate: 3d` and `npmPreapprovedPackages`, plus a frozen lockfile in CI.
- **CVE pin**: a `resolutions` entry carried over unchanged with its `//resolutions` note, and verified with `bun pm ls` before Yarn files are deleted.

**New**

```toml
# bunfig.toml
[install]
linker = "hoisted"
minimumReleaseAge = 259200
minimumReleaseAgeExcludes = ["twenty-ui", "esbuild@0.28.1"]
```

```yaml
# .github/actions/bun-install/action.yaml
inputs:
  bun-version:
    required: false
outputs:
  cache-hit: {}
```

**Modified**

```json
// package.json
{
  "packageManager": "bun@<pinned>",
  "engines": { "node": "^24.5.0" },
  "trustedDependencies": ["<each package whose install script must run>"],
  "patchedDependencies": {
    "@nestjs/graphql@13.4.5": "patches/@nestjs-graphql@13.4.5.patch",
    "danger@13.0.8": "patches/danger@13.0.8.patch",
    "front-matter@4.0.2": "patches/front-matter@4.0.2.patch",
    "react-phone-number-input@3.4.5": "patches/react-phone-number-input@3.4.5.patch",
    "typeorm@0.3.31": "patches/typeorm@0.3.31.patch"
  },
  "resolutions": { "...": "unchanged" }
}
```

```sh
# packages/twenty-docker/twenty/entrypoint.sh
# Container process commands:
#   setup      node dist/database/scripts/setup-db.js && node dist/command/command <migrate args>
#   command    node dist/command/command <name>
#   server     node dist/main
#   worker     node dist/queue-worker/queue-worker
```

## Notes

- Phase 1 changes no product behaviour, so the server keeps building after it. Phase 2 only starts once Phase 1's recovery record exists, and Phase 2 records the last commit of each server and front-end module it deletes.
- Webhooks, the workflow Webhook trigger, API keys, agents and skills stay. Nothing in Phase 2 may change their tables.
- Historical upgrade commands that import removed code are deleted, along with `@WasIntroducedInUpgrade` decorators on dropped columns. The one new command must have an epoch-ms timestamp greater than every command already in `2-48/`.
- Phase 3 runs after Phase 2, so the vendored `yarn-engine/` and `yarn-install/` are already gone and Bun is the only package manager. Root patches move from `.yarn/patches` and `packages/twenty-server/patches` to `patches/`.
- Compose, k8s and Helm call the same `node dist/...` commands as `entrypoint.sh`. `package.json` scripts stay for dev use.
