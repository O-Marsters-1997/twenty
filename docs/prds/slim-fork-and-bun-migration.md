# Slim fork and Bun migration

## Problem

The maintainer of this Twenty fork carries an app platform, a dozen app-based integrations and Yarn-specific tooling they don't use, and they want a smaller core CRM that installs and builds with Bun.

## Why

Twenty ships a full third-party app platform: a marketplace, app install and upgrade, app OAuth, registrations, pre-installed apps, front components rendered inside the CRM, and logic functions (user code the server installs with a vendored Yarn and runs locally or on AWS Lambda). Logic functions also power the workflow Code step, route triggers and app-provided AI tools. Every integration in `packages/twenty-apps/public` (Teams, Slack, Linear, Discord, Fathom, Fireflies, Granola, call recorder, People Data Labs, Exa, companion, last-contact) is built on this platform.

The fork needs none of it. Keeping it means hundreds of server and front-end files, five extra packages, a vendored Yarn engine, and Yarn lockfiles as a stored data format. All of that would have to be carried through a Bun migration or worked around. Removing the platform first makes the Bun move smaller and leaves one package manager in the repo.

## Goal

A core CRM fork with no app platform, installed and built with Bun, that keeps Yarn's supply-chain guards. Production images contain no package manager. Every removed integration can be recovered from git by following a written record.

## Concepts

**Application entity.** The core metadata owner. Every object, field, view and role belongs to an application (the Twenty standard application or the workspace custom application). It stays. Only the third-party app platform built around it goes.

**App platform.** Everything that lets a third party build, publish, install and run an app: the `application-*` server modules other than the core entity, logic functions, front components, the marketplace and the settings pages that expose them, plus the CLI, SDK and template packages.

**Logic function.** User-written server code, triggered by database events, cron, HTTP routes (route triggers), workflow steps or AI agent tools. Its npm dependencies are installed from an uploaded `yarn.lock` by a vendored `yarn-4.9.2.cjs`.

**Webhooks and the public API.** Outgoing webhooks, the workflow Webhook trigger, and the REST and GraphQL APIs. These don't depend on the app platform and stay, so n8n, Zapier and Make still connect.

**Recovery record.** `docs/removed-app-platform.md`. It lists the last commit containing each removed package and module, and the git commands to restore it.

## Journeys

### J1. Work in the repo without app tooling

Surface: CLI

1. Pull the branch and run `yarn install`.
2. Run the build, typecheck and unit tests for `twenty-server` and `twenty-front`.
3. Open a pull request.

→ `twenty-cli`, `create-twenty-app`, `twenty-apps`, `twenty-agent-skills`, `twenty-claude-skills`, `twenty-companion` and `twenty-zapier` are gone from `packages/` and root `workspaces`, and CI passes with no app, create-app or verdaccio jobs.

### J2. Recover a removed integration later

Surface: CLI

1. Open `docs/removed-app-platform.md`.
2. Find the integration, for example Teams, and its recorded commit.
3. Run the listed `git checkout <commit> -- <paths>` command.

→ The integration's source is back in the working tree at the recorded version, and the record names the platform pieces it also needs.

### J3. Build a workflow without code steps

Surface: UI

1. Open a workflow and add an action.
2. Browse the action menu.
3. Add a Webhook trigger and a record action, then activate the workflow.

→ The menu has no Code or Logic Function action, and the activated webhook workflow runs and shows a successful run.

### J4. Manage settings in a core CRM

Surface: UI

1. Open Settings.
2. Look through the sidebar.
3. Open Data model, Webhooks and API keys.

→ No Applications, Logic Functions, marketplace or app registration entries appear, and Data model, Webhooks and API keys still work.

### J5. Connect n8n

Surface: API

1. Create an API key in Settings.
2. Add a webhook pointing at an n8n Webhook node.
3. Create a person record.

→ n8n receives the record-created event, and an n8n HTTP node can read the record back through the API with the key.

### J6. Create a fresh workspace

Surface: CLI

1. Run `npx nx database:reset twenty-server` on an empty database.
2. Sign up and create a workspace.

→ The database has no logic-function, front-component, app-registration or app-package tables or columns, no pre-installed-app jobs are queued, and the workspace opens with standard objects.

### J7. Set up and run the repo with Bun

Surface: CLI

1. Clone the repo and run `bun install`.
2. Run `bash packages/twenty-utils/setup-dev-env.sh`.
3. Run `bun run start`.

→ Front end, server and worker start, the app loads in the browser, and no `yarn.lock`, `.yarn/`, `.yarnrc.yml` or `yarn.config.cjs` exists.

### J8. Get a green CI run on Bun

Surface: CLI

1. Push a branch.
2. Watch the workflows run.

→ Every workflow installs with `bun install --frozen-lockfile`, and builds, lint, typecheck, unit, integration and e2e jobs pass.

### J9. Build and run the production image

Surface: CLI

1. Build `packages/twenty-docker/twenty/Dockerfile`.
2. Start it with `docker-compose.yml`.

→ The server runs migrations and serves requests, the worker processes jobs and crons register, and neither `yarn` nor `bun` is on the image's PATH.

### J10. Get blocked by an unsafe dependency

Surface: CLI

1. Add a dependency published less than three days ago, or one with an untrusted install script.
2. Run `bun install`.

→ Install refuses the too-new version, skips the untrusted script, and every CVE pin from the old `resolutions` still resolves to its pinned version (`bun pm ls`).

## Delivery slices

1. **Remove app developer tooling** — the repo no longer contains the app CLI, template, example and public apps, agent skills, companion or Zapier packages, their CI or verdaccio publishing, and the recovery record exists. The product is unchanged. Journeys: J1, J2
2. **Remove the app platform** — CRM users see a core CRM with no apps, logic functions, front components, Code steps or route triggers, while webhooks and the API keep working, and new workspaces start without app-platform tables. Journeys: J3, J4, J5, J6
3. **Migrate to Bun** — developers, CI and Docker builds use Bun with Yarn's supply-chain guards, production runs `node` directly, and all Yarn files are gone. Journeys: J7, J8, J9, J10

## Out of scope

Switching the runtime from Node to Bun, or the test runners from Jest and Vitest to `bun test`. Porting any removed integration into native code. Native integrations that aren't apps (Gmail, Google Calendar, Microsoft email and calendar sync) stay as they are. Merging from upstream `twentyhq/twenty`: the fork diverges here, and upstream fixes are cherry-picked by hand. Preserving data in existing deployments, since there are none. Translation catalogs regenerate as a side effect and aren't edited by hand.

## Open questions

**Should pins for removed parents carry over?** Some `resolutions` entries exist only for packages slice 1 removes (`zapier-platform-*`, verdaccio). The decision was to match Yarn's guards, so they carry over unless the parent is absent from the installed tree. Confirm during slice 3 whether to delete them.

**Does n8n ship a Twenty node?** J5 uses n8n's generic Webhook and HTTP nodes, which work either way. Not verified.

**Is there a native integration nobody knew was an app?** Slice 2 removes everything built on the app platform. Before deleting, list any pre-installed app registrations seeded into new workspaces and confirm none deliver a feature that was meant to stay.

**What happens to existing data?** Resolved: fresh fork, no deployments. A plain migration drops the tables.

**What happens to historical upgrade commands that import removed code?** Resolved: delete them, and add one new command in the current version folder that drops the app-platform tables.

**What do production containers run?** Resolved: `node dist/...` directly, with no package manager in the image.

**How are the docs handled?** Resolved: delete app, logic-function and Code-step pages in every locale, regenerate navigation and paths with the docs scripts, and remove the website's app-preview section.
