# CI speed and toolchain overhaul

## Problem

The maintainer waits about 5 minutes for a front-only PR and about 17.5 minutes for a main run, mostly on queueing and repeated setup. The task runner, test runner and linter behind those runs are tools they want to replace anyway.

## Why

Benchmarks from 2026-11-20 (#153):

- **Front-only PR run** [44734509550](https://github.com/O-Marsters-1997/twenty/actions/runs/44734509550): about 5 min wall. The critical path is `changes` (~20s) followed by front jest shard 1 (253s). That shard breaks down as 55s checkout, 29s bun install, 13s `reset:env`, 40s rebuilding twenty-shared and twenty-ui, and 104s of jest.
- **Full main run** [44733392222](https://github.com/O-Marsters-1997/twenty/actions/runs/44733392222): about 17.5 min. Most of that time is queueing, at 200 to 580s per job.

A full run starts 19 runners. Main pushes never cancel each other, so merging a stack queued 8 main runs one behind another. Nothing caches between jobs, so every front and ui job rebuilds the same dependencies.

Nx is used shallowly: `run-commands` targets, three executors and the local cache. Jest needs a custom StyleX transformer and a hand-kept `transformIgnorePatterns` list, while twenty-ui already runs on Vitest. oxlint and oxfmt are two tools carrying about 25 custom rules the maintainer no longer wants to maintain.

## Goal

The finished state:

- A front-only PR finishes CI in **3 minutes or less** and a full main run in **6 minutes or less**, measured as wall clock.
- Tasks run through moon.
- Unit tests in twenty-front, twenty-shared, twenty-utils and twenty-emails run on Vitest.
- Every TS/JS package is linted and formatted by Biome.

Each slice records before and after times in its PR.

## Concepts

**Runner.** One GitHub Actions job on a fresh VM. Each one pays about 2 minutes of setup and takes one of the account's concurrent-job slots. A task earns its own runner only when running it in parallel saves more than that.

**moon.** The task runner that replaces Nx ([ADR 0003](../adr/0003-moon-replaces-nx.md)). It is configured by hand, with explicit `inputs` on every task. CI keeps named jobs that call `moon run`, and moon's affected detection replaces the tj-actions changed-files filter. `actions/cache` persists `.moon/cache`, so build, lint, typecheck and test all replay from cache when their inputs haven't changed.

**Vitest.** The unit test runner for every JS package ([ADR 0005](../adr/0005-vitest-replaces-jest.md)). twenty-front gains a jsdom `unit` project beside its Storybook project in `vitest.config.ts`, the same way twenty-ui does it.

**Biome.** The only linter and formatter ([ADR 0004](../adr/0004-biome-replaces-oxlint-and-oxfmt.md)). One root `biome.json` uses the recommended defaults. The old custom and StyleX rules are not ported.

**Skip cap.** During the Vitest cutover, a suite that cannot be fixed quickly gets `describe.skip` with a linked issue. If more than about 2% of a package's suites are skipped, its PR doesn't merge.

## Journeys

### J1. Merge a stack of PRs to main

Surface: CLI

1. Merge five stacked PRs in a row.
2. Open the Actions tab for main.

→ Only the newest main run is in progress. The older ones show as cancelled, not queued.

### J2. Read a PR's checks

Surface: UI

1. Open a PR that touches every package.
2. Look at the checks list.

→ About 10 jobs are listed (changes, go, front static, three front test shards, ui, shared/emails/utils, knip, status). A failing task is named in its job's log, and the other tasks in that job still ran.

### J3. Run a task locally with moon

Surface: CLI

1. Run `moon run twenty-front:typecheck`.
2. Run it again with no changes.

→ The second run is a cache hit, and no `nx` command, `nx.json` or `@nx/*` dependency is left in the repo.

### J4. Push a change that leaves a package untouched

Surface: CLI

1. Open a PR that only changes twenty-server-go.
2. Then push a docs-only commit to main.

→ The PR runs no front, ui or shared tasks. On main, front tests, lint and typecheck replay from the restored `.moon/cache` and their logs show cache hits.

### J5. Work as an agent under the CI guardrails

Surface: CLI

1. An agent tries the moon equivalent of a package-wide front or ui test run.
2. The agent runs a single-file test and a typecheck through `scripts/heavy`.

→ The deny hook blocks the package-wide run and allows the other two. CLAUDE.md, `setup-dev-env.sh` and the README name moon commands only.

### J6. Run front unit tests on Vitest

Surface: CLI

1. Run a single front spec with Vitest.
2. Run the shared, utils and emails suites.

→ All four packages pass on Vitest. Jest is gone from the repo, along with `jest-stylex-transformer.cjs` and every Jest config, and every skipped suite links an open issue, within the skip cap.

### J7. Lint and format with Biome

Surface: CLI

1. Run Biome's check with writes enabled on a changed file.
2. Open `biome.json`.

→ The file is formatted and linted by Biome alone. oxlint, oxfmt, every `.oxlintrc.json` and `packages/twenty-oxlint-rules` are gone. Each rule disabled at cutover has an open issue to re-enable it.

### J8. Hit the target times

Surface: UI

1. Open a front-only PR and wait for CI.
2. Merge it and wait for the main run.

→ The PR finishes in 3 minutes or less and main in 6 minutes or less. The front shard count was settled by measurement: a 4th shard was added only if it cut the critical path by 20s or more.

## Delivery slices

1. **Quick wins.** Newer main pushes cancel older runs, and a full run uses about 10 runners instead of 19. This is a YAML-only change, still on Nx, with no Nx cache step. Journeys: J1, J2
2. **moon.** Nx is replaced by hand-written moon config, and CI jobs call `moon run` with affected detection and a persisted `.moon/cache`. The hook and docs are updated in the same change. Journeys: J3, J4, J5
3. **Vitest.** utils and emails, then shared, then front, each in its own PR and each flipping fully. Runs in parallel with slice 4. Journeys: J6
4. **Biome.** One repo-wide cutover PR: format and apply safe fixes, then disable any rule still failing and file a re-enable issue for each. Runs in parallel with slice 3. If the two collide, Biome merges first and the Vitest branches rebase. Journeys: J7
5. **Measure and tune.** Re-benchmark both run types, decide on the 4th front shard, and record final times. Journeys: J8

## Out of scope

- Porting the custom `twenty/*` lint rules or the StyleX lint rules to Biome.
- Type-aware linting (oxlint `--type-aware`). The tsgo typecheck stays the type gate.
- A remote moon cache (bazel-remote, Depot). `actions/cache` is enough until hit rates show otherwise.
- `moon ci --job` sharding across generic runners.
- Storybook, e2e and front build jobs, which don't run in CI today.

## Open questions

- **Biome vs oxlint benchmark?** Resolved: not needed. Biome is adopted for one-tool lint and format, not for speed.
- **Nx cache in phase 1?** Resolved: dropped. moon's cache replaces it.
- **Setup job vs per-job cache?** Resolved: per-job cache. A setup job adds about 2 min of serial time to every run.
- **The concurrent-job cap is assumed to be the free plan's 20.** This is unverified for this account.
- **moon v2 command names (`moon ext migrate-nx`, `enforceLayerRelationships`) come from the docs and haven't been tried.** Confirm with `moon --help` at the start of slice 2.

Source: grilled from #153, which this PRD supersedes.
