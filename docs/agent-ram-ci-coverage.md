# CI coverage audit for agent RAM reduction (#21)

Read-only audit of `.github/workflows` and the fork `O-Marsters-1997/twenty` (public, fork, default branch `main`) on 2026-11-03. Question: does CI run what agents will stop running locally?

## Verdict

CI covers every command except **front build and Storybook**. `CI Front` pins `front-sb-build` and `front-build` to `ubuntu-latest-8-cores`, a GitHub larger runner. The fork has no registered runners (`actions/runners` total_count 0). In run 41530999293 (branch `issue-3/delete-companion-zapier`) both jobs started at 22:17:46Z, were never given a runner, and ended `cancelled`. All six `CI Front` runs on the fork ended `cancelled`.

The `ubuntu-latest` front jobs do run in the fork: in the same run `front-task` lint, typecheck, lingui-extract, lingui-compile and test shards 1-3 all succeeded.

## Enabled and triggered

- Actions are enabled: `allowed_actions: all`. No workflow is in a non-active state.
- `ci-front`, `ci-server`, `ci-shared`, `ci-ui`, `ci-sdk` use `pull_request:` with no `branches:` filter, so PRs whose base is `feat/agent-ram` match. Only the `push:` triggers are limited to `main`.
- Each job is gated by `changed-files.yaml` (paths such as `packages/twenty-front/**`, plus `package.json` and `yarn.lock`). A docs-only or `scripts/`-only PR skips the suite.
- No branch protection on `feat/agent-ram` (404), so no check is required.
- Real CI runs exist for PRs into other branches (2026-11-02). PRs #28 and #29 (base `feat/agent-ram`) have zero runs and zero check results; both merged about two minutes after creation. Cause unverified, so "PRs into `feat/agent-ram` run CI" is implied by the workflow files but not demonstrated.

## Command to workflow

"Ran" means the job reached a runner in the fork; it says nothing about pass or fail.

| Command agents stop running | Covering job | Runner | Status |
|---|---|---|---|
| `nx test`, `typecheck`, `lint`, `lingui:*` twenty-front | `ci-front` / `front-task` (test in 3 shards) | ubuntu-latest | covered, ran, passed (run 41530999293) |
| `nx build twenty-front` | `ci-front` / `front-build` | **ubuntu-latest-8-cores** | **gap: never got a runner** |
| `nx storybook:build twenty-front` | `ci-front` / `front-sb-build` | **ubuntu-latest-8-cores** | **gap: never got a runner** |
| `nx storybook:test twenty-front` | `ci-front-storybook-test` (modules x8, pages x4, performance x4) | ubuntu-latest | ran, **all failed**; they restore the cache `front-sb-build` saves, which never exists. Failure cause not checked in logs |
| `nx test`, `typecheck`, `lint` twenty-server | `ci-server` / `server-test` (4 shards), `server-lint-typecheck` | ubuntu-latest | ran; `server-lint-typecheck` and `server-test (1)` failed on the `issue-2` run (not examined) |
| `nx build twenty-server` | `ci-server` / `server-build` | ubuntu-latest | ran, succeeded |
| `nx run twenty-server:test:integration*` | `ci-server` / `server-integration-test` (16 shards, Postgres) | ubuntu-latest | ran, all 16 succeeded on the `issue-2` run |
| twenty-ui `lint`, `typecheck`, `test`, `size`, `pack-size` | `ci-ui` / `ui-task` | ubuntu-latest | defined; per-task result not checked |
| `nx storybook:build twenty-ui` and tests | `ci-ui` / `ui-sb-build`, `ui-sb-test` | ubuntu-latest | `ui-sb-test` failed on the `issue-2` run (not examined) |
| twenty-shared `lint`, `typecheck`, `test` | `ci-shared` / `shared-test` | ubuntu-latest | ran, succeeded |
| twenty-sdk build, test, e2e | `ci-sdk` | ubuntu-latest | ran, succeeded |
| twenty-e2e-testing (Playwright) | `ci-e2e-main` | ubuntu-latest-8-cores | not run on ordinary PRs: push to `main`, or a PR labelled `qa-scout` or `run-merge-queue`; 8-core, so would not get a runner |

Not audited: `twenty-front-component-renderer`, Knip and CLI workflows. Front jobs use `nx affected` with `--exclude="*,!tag:scope:frontend"`.

## Affordability

`ubuntu-latest` minutes are free on a public repo. The heaviest PR cost is server-affecting: 16 integration shards plus 4 unit shards, cancelled on a new push (`cancel-in-progress` except on `main`); the `issue-2` integration shards each took roughly 10-15 minutes. Larger runners are billed even on public repos.

## Uncovered, keep allowed for agents

1. `nx build twenty-front`
2. `nx storybook:build twenty-front` and `nx storybook:test twenty-front`
3. Playwright / `twenty-e2e-testing` on ordinary PRs

Front test, typecheck and lint, all server commands, shared and sdk are safe to ban from agents once PRs into `feat/agent-ram` are shown to trigger CI.

## Recommended follow-up (not done here)

- Change `runs-on` in `ci-front.yaml` (lines 43 and 188) from `ubuntu-latest-8-cores` to `ubuntu-latest`, and update the `*-8-cores-runner` cache-key strings in `ci-front.yaml` and `ci-front-storybook-test.yaml` to match. Watch the 30-minute timeout and memory.
- Open a throwaway PR into `feat/agent-ram` touching `packages/twenty-front` and confirm each job reaches a runner before banning anything.
- Consider requiring checks on `feat/agent-ram`.
