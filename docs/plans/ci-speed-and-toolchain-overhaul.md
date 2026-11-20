# Plan: CI speed and toolchain overhaul

> Source: docs/prds/ci-speed-and-toolchain-overhaul.md
> Label: project:ci-speed-and-toolchain-overhaul
> Feature branch: feature/ci-speed-and-toolchain-overhaul

The CI workflow gets fewer, merged jobs and cancels stale main runs. moon replaces Nx as the task runner, with its cache persisted in CI. Vitest replaces Jest, and Biome replaces oxlint and oxfmt. Everything lives in `.github/`, `.moon/`, per-package config and the agent hook.

Definitions are frozen once tickets are cut: changing one is a `contract-change` issue that blocks dependent work, never a quiet edit.

## Phases

1. [Quick wins](#phase-1-quick-wins)
2. [moon](#phase-2-moon)
3. [Vitest](#phase-3-vitest)
4. [Biome](#phase-4-biome)
5. [Measure and tune](#phase-5-measure-and-tune)

## Phase 1: Quick wins

Journeys: J1, J2

**Glossary**

- **Main group**: the one concurrency group every main push shares. A newer push cancels the older run.
- **Merged job**: one runner running several tasks of a package (or several small packages) in parallel, without bailing on the first failure.

**Modified**

```yaml
# .github/workflows/ci.yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:          # outputs: go, front, ui, shared, emails, utils, knip (unchanged)
  go:               # one job: generated-code check, then build, vet, test
  front-static:     # lint + typecheck, one runner
  front-test:       # matrix: shard [1, 2, 3]
  ui:               # lint, generate:check, typecheck, test, one runner
  shared-emails-utils: # shared lint/typecheck/test, emails build+lingui+preview, utils test, one runner; each part gated on its changes output
  knip:             # unchanged
  ci-status-check:  # needs: [changes, go, front-static, front-test, ui, shared-emails-utils, knip]
```

## Phase 2: moon

Journeys: J3, J4, J5

**Glossary**

- **moon project**: a package under `packages/` with a `moon.yml`. Its id is the package directory name, e.g. `twenty-front`.
- **Task id**: a moon task name. moon uses `:` as the project/task separator, so Nx's `lingui:extract` becomes `lingui-extract`, `generate:check` becomes `generate-check`, and `reset:env` becomes `reset-env`.
- **Inherited task**: a task defined once in `.moon/tasks/` and picked up by every matching project (typecheck, for example).
- **moon cache**: `.moon/cache/{hashes,outputs}`, restored and saved per job by `actions/cache`.
- **Affected project**: a project whose inputs changed between base and head, according to moon.

**New**

```yaml
# .moon/workspace.yml
projects:
  - 'packages/*'
vcs:
  client: git
  defaultBranch: main
```

```yaml
# .moon/toolchains.yml
javascript:
  packageManager: bun
bun:
  version: '1.3.11'
typescript: {}
go: {}
```

```yaml
# .moon/tasks/typescript.yml   (inherited by language: typescript projects)
fileGroups:
  sources: ['src/**/*', 'package.json', 'tsconfig*.json']
  tests: ['src/**/*.{spec,test}.{ts,tsx}', 'src/**/__mocks__/**/*']
tasks:
  typecheck:
    command: tsgo -p tsconfig.json --noEmit
    deps: ['^:build']
    inputs: ['@group(sources)']
```

```yaml
# packages/<project>/moon.yml   (task ids per project; inputs/outputs explicit on each)
# twenty-shared:     build, typecheck, lint, fmt, test, generate-barrels
# twenty-ui:         build, typecheck, lint, fmt, test, generate-check, generate-tokens,
#                    generate-barrels, generate-icon-dictionary, check-icon-dictionary,
#                    size, pack-size, knip, storybook-build, storybook-dev
# twenty-front:      build, typecheck, lint, lint-diff, fmt, test, start, preview, reset-env,
#                    knip, lingui-extract, lingui-compile, graphql-generate, mock-generate,
#                    storybook-build, storybook-dev
# twenty-emails:     build, typecheck, lint, fmt, test, start, lingui-extract, lingui-compile
# twenty-utils:      test
# twenty-server-go:  build, test, lint, generated-check, golden-record, e2e
# twenty-e2e-testing: setup, test
# twenty-oxlint-rules: build, typecheck, test   (deleted in phase 4)
language: typescript
layer: application | library | tool
dependsOn: [<project ids>]
tasks:
  <task-id>:
    command: <string>
    deps: [<target>]
    inputs: [<file group or glob>]
    outputs: [<glob>]          # build tasks only
    options:
      cache: true              # false only for start, preview, storybook-dev, reset-env
```

```yaml
# .github/actions/moon-cache/action.yaml
inputs:
  key-prefix: { required: true }   # e.g. moon-<job name>
outputs:
  cache-hit: {}
# restores .moon/cache/{hashes,outputs} on start, saves it after the job;
# key <prefix>-<github.sha>, restore-keys <prefix>-
```

**Modified**

```yaml
# .github/workflows/ci.yaml
jobs:
  changes:   # same outputs, computed from moon's affected projects instead of tj-actions/changed-files
  # every other job: checkout (filter: blob:none), bun-install, moon-cache, then moon run <project>:<task>...
  front-test:
    strategy: { matrix: { shard: [1, 2, 3] } }   # moon run twenty-front:test -- --shard=N/3
```

```sh
# .claude/hooks/deny-ci-commands.sh   (denied command shapes)
moon run twenty-(front|ui):test           # package-wide, without a file argument
moon run :test | moon ci                  # all-projects test runs
(^|[^a-z])tsgo( |$) unless via scripts/heavy
```

Deleted: `nx.json`, every `project.json`, root `nx`/`@nx/*` devDependencies and Nx resolutions, `packages/twenty-front/src/nx-react.d.ts`.

## Phase 3: Vitest

Journeys: J6

**Glossary**

- **Unit project**: the jsdom Vitest project in a package's `vitest.config.ts`, separate from twenty-front's existing `storybook` browser project.
- **Skip cap**: at most about 2% of a package's suites may be skipped with `describe.skip`, each with a linked issue.

**New**

```ts
// packages/twenty-utils/vitest.config.ts, packages/twenty-emails/vitest.config.ts,
// packages/twenty-shared/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node' /* utils */ | 'jsdom' /* emails, shared */,
    globals: true,
    setupFiles: [/* shared: './vitest.setup.ts' */],
    include: ['**/*.{spec,test}.{ts,tsx}'],
  },
});
```

**Modified**

```ts
// packages/twenty-front/vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      { extends: './vite.config.ts', test: { name: 'storybook' /* unchanged */ } },
      {
        extends: './vite.config.ts', // StyleX + Lingui plugins come from here
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./setupTests.ts'],
          include: ['src/**/*.{spec,test}.{ts,tsx}'],
          env: { TZ: 'GMT' },
        },
      },
    ],
  },
});
```

```yaml
# packages/{twenty-front,twenty-shared,twenty-utils,twenty-emails}/moon.yml
tasks:
  test:
    command: vitest run --project unit   # front; plain `vitest run` elsewhere
    inputs: ['@group(sources)', '@group(tests)', 'vitest.config.ts', 'setupTests.ts']
```

Deleted: every `jest.config.mjs`, `jest.preset.js`, `jest-stylex-transformer.cjs`, `jest-failures-only-reporter.cjs`, `.swcrc` files used only by Jest, and `jest`, `@swc/jest`, `@types/jest`, `ts-jest` from dependencies.

## Phase 4: Biome

Journeys: J7

**Glossary**

- **Disabled-at-cutover rule**: a recommended Biome rule turned `off` in `biome.json` because it still failed after the safe fixes. Each one has an open issue to re-enable it.

**New**

```jsonc
// biome.json
{
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true, "defaultBranch": "main" },
  "files": { "includes": ["packages/**", "!packages/twenty-server-go/**", "!**/generated/**"] },
  "formatter": { "indentStyle": "space", "lineWidth": 80 },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all" } },
  "linter": {
    "rules": {
      "recommended": true
      // "<group>": { "<rule>": "off" }  one entry per disabled-at-cutover rule
    }
  }
}
```

**Modified**

```yaml
# packages/<every TS/JS project>/moon.yml
tasks:
  lint:
    command: biome check .
  lint-diff:                     # twenty-front only; replaces lint:diff-with-main
    command: biome check --changed --since=main
  fmt:
    command: biome check --write .
```

Deleted: `packages/twenty-oxlint-rules`, every `.oxlintrc.json`, `.oxfmtrc.jsonc`, the `prettier` block in root `package.json`, and `oxlint`, `oxfmt` and `@stylexjs/eslint-plugin` from dependencies.

## Phase 5: Measure and tune

Journeys: J8

No new definitions. `front-test`'s shard matrix in `ci.yaml` becomes `[1, 2, 3, 4]` only if a 4th shard cuts the measured critical path by 20s or more.

## Notes

- Every moon task declares explicit `inputs`. moon's default `**/*` would invalidate the cache on unrelated edits (ADR 0003).
- Docs and tooling move in the same phase as the change they describe: CLAUDE.md commands, `setup-dev-env.sh`, `twenty-utils` scripts, the README, generated-file headers in twenty-ui and `icon-dictionary.md`.
- Phases 3 and 4 run in parallel on the feature branch. If they collide, phase 4's reformat merges first.
- The moon v2 key names above (`layer`, toolchain ids, `.moon/tasks/` layout) follow the docs and are unverified. If `moon --help` or the schema disagrees, that's a `contract-change`, not a quiet edit.

### PRD drift

- Vitest scope was front, shared and utils → twenty-emails added so Jest leaves the repo. Edited in PRD and ADR 0005.
- Losing type-aware lint (front's `oxlint --type-aware`) was unstated → recorded as out of scope. Edited in PRD and ADR 0004.
