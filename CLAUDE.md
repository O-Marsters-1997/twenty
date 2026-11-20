# CLAUDE.md

Twenty is an open-source CRM — an Nx / Bun monorepo. Main packages: `twenty-front` (React 18, Jotai, StyleX, Vite), `twenty-server-go` (Go, PostgreSQL, GraphQL), `twenty-shared` (isomorphic types/utils), `twenty-ui`, `twenty-e2e-testing` (Playwright).

Match the surrounding code — the adjacent files in the directory you are editing beat any written rule, including for file naming, which varies by area.

## House rules

Where this repo differs from your defaults:

- Short-form `//` comments, never JSDoc blocks; comment only WHY (a constraint the code cannot express, still true for a reader who never saw your change), never WHAT.
- Types over interfaces (except when extending third-party interfaces); string literals over enums (except GraphQL enums); no `any`; descriptive generics (`TData`, not `T`).
- Named exports only. Functional components only.
- Prefer event handlers over `useEffect` for state updates.
- No abbreviations in names (`fieldMetadata`, not `fm`); constants in SCREAMING_SNAKE_CASE; component props types suffixed `Props`.
- Use existing guards and helpers before writing your own: `isDefined`, `isNonEmptyArray`, `isPlainObject`, … from `twenty-shared/utils`; `isNonEmptyString`, `isString`, `isNull`, `isObject`, … from `@sniptt/guards`. Reimplementing an existing util is the most common AI-authored defect here.
- Lingui for user-facing strings; StyleX for styling (`docs/styling.md`).
- For Twenty product concepts, consult `packages/twenty-ui/src/icon/icon-dictionary.md` and use the canonical icon.
- Import icons from `twenty-ui/icon`, never directly from `@tabler/icons-react`; action and status concepts should use their action or status icons.
- Test behavior, not implementation: query by user-visible text/roles, `@testing-library/user-event` for interactions.

## Commands

```bash
bash packages/twenty-utils/setup-dev-env.sh   # Postgres + DB init; only for tasks needing a running app
bun run start                                 # front

npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs   # single test file (preferred)
npx vitest run --root packages/twenty-ui --project unit <file>          # twenty-ui runs on vitest, not jest
npx moon run twenty-front:storybook-build

npx moon run twenty-front:lint-diff           # diff-based lint (fast); run with typecheck after changes
npx moon run <pkg>:fmt                        # format check
npx moon run twenty-shared:build              # required before building/testing packages that depend on it
npx moon run twenty-front:graphql-generate    # after GraphQL schema changes
```

## Agent versus CI

Agents run only: a typecheck of the touched package through `scripts/heavy` (`scripts/heavy npx tsgo -p tsconfig.json --noEmit`, which serialises memory-heavy runs), single-file jest, and `moon run twenty-front:lint-diff`. CI runs package-wide `moon run twenty-front:test` and `twenty-ui:test`. A `PreToolUse` hook (`.claude/hooks/deny-ci-commands.sh`) denies those commands, `moon run :test`, `moon ci` and a bare `tsgo`. twenty-shared tests are cheap and not banned.

CI is one workflow, `.github/workflows/ci.yaml`, with a single required check, `ci-status-check`, the only entry in `.command-centre.toml`. Its jobs run in parallel and all run on every main push: Go generated code, build, vet and test; front lint, typecheck and jest; ui lint, generate-check, typecheck and test; shared, emails, utils and knip. No storybook or front build runs in CI, so those stay allowed locally.

## Gotchas

- **`twenty-shared/dist` is per-branch state nothing tracks.** After switching branches or editing `twenty-shared`, run `npx moon run twenty-shared:build --force` before trusting any typecheck or test failure in a dependent package.
- **moon caching can serve a stale pass.** To verify a fix, run `npx tsgo -p tsconfig.json --noEmit` in the package directly rather than `moon run <pkg>:typecheck`.
- **Commit messages must not carry AI attribution.** CI rejects commits containing `@anthropic.com` co-author trailers or "Generated with Claude Code" lines.
- A read-only Postgres MCP server is configured in `.mcp.json` for inspecting workspace data, metadata, and migration results. Writes go through the CLI commands above.
- E2E login: click "Continue with Email" and use the prefilled credentials.

## Fleet

Run at most 5 implementation subagents at once in `/fleet dispatch`; start the next ticket as one finishes.
