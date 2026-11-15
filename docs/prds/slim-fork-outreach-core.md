# Slim fork to an outreach core

## Problem

The maintainer runs this Twenty fork as a single-owner outreach tool, mainly for pitching side businesses to business owners and also for job outreach, and it still carries a SaaS layer, marketing and docs sites, extra mail providers and telemetry they don't need.

## Why

The first slim pass (`docs/prds/slim-fork-and-bun-migration.md`) removed the app platform and moved the repo to Bun. What's left is still built for a hosted multi-tenant product: Stripe billing and usage caps, enterprise licence and seat limits, an admin panel, SSO, custom domains, Sentry and ClickHouse analytics, Microsoft and IMAP mail, and two packages (`twenty-website`, `twenty-docs`) with their own CI and Crowdin pipelines. None of it helps one owner run outreach, and every piece is code to typecheck, test and carry through future changes.

The AI stack is the opposite: it is the main reason to use this fork. Rubric-based lead classification, AI-filled outreach templates, and agents and skills for repetitive work all build on what exists today, so it stays apart from a few edges.

## Goal

A single-owner CRM for outreach with email/password and Google login, Gmail and Google Calendar sync, sending from the CRM, workflows, CSV import/export, dashboards, timeline, and the AI core (agents, skills, chat, workflow AI actions, tool providers, MCP). It runs with no billing, licence, SSO, custom-domain or telemetry configuration. Every removed area can be recovered from git by following a written record.

## Concepts

**Single-owner instance.** One deployment, one owner. The workspace model stays because it is too deep to remove, but nothing about plans, seats, trials, licence keys or per-workspace domains remains.

**SaaS layer.** Billing and Stripe webhooks, usage and usage limits, `ai-billing`, enterprise licence and seat limits, the admin panel, SSO (SAML and OIDC), custom domains and the Cloudflare and DNS managers, along with their settings pages and env vars.

**AI core.** `ai-agent` and its role, trigger, run and execution modules, `skill`, `ai-chat`, `ai-generate-text`, `ai-history`, `ai-models`, `ai-tool-call-answer`, the tool providers, the email, send-email, calendar, HTTP and record tools, the Classify, AI Agent and Mail sender workflow actions, and the MCP server (`engine/api/mcp`). It stays.

**AI edges.** `ai-billing` (removed with the SaaS layer), the code interpreter module and tool, the help-center search tool, `ai-workspace-stats` and front-end dictation. Removed.

**Telemetry.** Sentry (server and front), the `telemetry` and `metrics` modules, usage analytics and front-end analytics. Removed. ClickHouse itself stays as optional infrastructure, inactive until `CLICKHOUSE_URL` is set, because email-campaign open and click tracking and the audit-log viewer store their data there.

**Recovery record.** `docs/removed-app-platform.md`, extended with a section per area this PRD removes, each giving the last commit that contains it and the `git checkout` paths to restore it.

## Journeys

### J1. Work in a repo without marketing or docs sites

Surface: CLI

1. Pull the branch and run `bun install`.
2. Run the typecheck and unit tests for `twenty-server` and `twenty-front`.
3. Push and watch CI.

→ `packages/twenty-website` and `packages/twenty-docs` are gone from the tree, root workspaces, `nx.json` and `knip.json`, there are no docs, website or Crowdin workflows or configs in `.github/`, and CI is green.

### J2. Start a fresh single-owner instance

Surface: UI

1. Run `npx nx database:reset twenty-server` on an empty database.
2. Sign up with email and password and create a workspace.
3. Open the workspace.

→ No billing, plan, trial, seat-limit or enterprise-key screen appears at any point, and the database has no billing tables.

### J3. Use AI with no credit system

Surface: UI

1. Set only an OpenAI or Anthropic API key in the server env.
2. Ask the AI chat to find a person record.
3. Run an agent from a workflow.

→ The chat answers, the agent run completes and shows in run history, and no credit, usage-cap or billing error appears.

### J4. Manage settings as the only owner

Surface: UI

1. Open Settings.
2. Look through the sidebar.
3. Open Data model, Webhooks, API keys, AI and Accounts.

→ There are no Billing, Admin panel, SSO, Domains or Enterprise entries, and the pages that remain load and save.

### J5. Connect Gmail for outreach

Surface: UI

1. Open Settings, then Accounts, and add an account.
2. Connect a Google account.
3. Open a person record and send them an email.

→ Only Google is offered, the login page has no Microsoft button, mail and calendar events sync, and the sent email appears on the person's timeline.

### J6. Classify a lead by rubric in a workflow

Surface: UI

1. Create a workflow triggered by "Person created" with a Classify step whose prompt is a rubric and whose output updates a select field on the person.
2. Activate it and create a person.
3. Open the person record and the workflow run.

→ The person has a classification label, the run is successful, and the agent tool list offers no code interpreter or help-center search.

### J7. Run without telemetry

Surface: CLI

1. Start the server and worker with no Sentry, ClickHouse or analytics env vars set.
2. Load the app in the browser and click through records and settings.
3. Set `CLICKHOUSE_URL` and send an email campaign.

→ Without ClickHouse, both processes start, no request goes to Sentry or an analytics endpoint, and the app works apart from campaign engagement counts and audit logs. With it, opens and clicks are counted.

### J8. Recover a removed area

Surface: CLI

1. Open `docs/removed-app-platform.md`.
2. Find an area, for example billing or Microsoft mail, and its recorded commit.
3. Run the listed `git checkout <commit> -- <paths>` command.

→ The area's source is back in the working tree at the recorded version, and the record names the modules, env vars and migrations it also needs.

## Delivery slices

1. **Drop marketing and docs packages.** The repo no longer contains the website or the docs site, their CI or their translation pipelines, the stray untracked package folders and `.yarn/` are cleaned up locally, and the recovery record has its first new section. The product is unchanged. Journeys: J1, J8
2. **Single-owner instance.** The owner signs up and works with no billing, plan, seat, licence, admin-panel, SSO or custom-domain surface anywhere, and AI runs without a credit system. `ai-billing` goes in this slice because AI chat's turn preflight calls it. Journeys: J2, J3, J4
3. **Gmail-only email.** Google is the only mail and calendar provider and the only social login, and Microsoft and IMAP/SMTP/CalDAV are gone. Journeys: J5
4. **Trim telemetry and AI edges.** The app runs with no telemetry, and the AI core loses the code interpreter, help-center search, workspace AI stats and dictation while workflow classification keeps working. Journeys: J6, J7

## Out of scope

- Reshaping standard objects (Company, Person, Opportunity, Note, Task, Attachment). Outreach objects such as rubrics, lead scores and template libraries get their own PRD.
- Building new AI features. This PRD only removes.
- Removing Lingui or any locale catalog. Catalogs regenerate as a side effect and aren't edited by hand.
- Removing the workspace model.
- Removing workflows, CSV import/export, dashboards, page layout, timeline or calendar.
- Removing `twenty-docker`, `twenty-emails`, `twenty-e2e-testing`, `twenty-utils` or `twenty-oxlint-rules`.
- Preserving data in existing deployments, since there are none.

## Open questions

**Does anything kept read from ClickHouse?** Resolved: email-campaign engagement (`modules/emailing`) and the audit-log viewer (`event-logs`) do, and the record timeline doesn't. ClickHouse stays optional, and only analytics, usage analytics, Sentry and telemetry are removed.

**What does billing gate outside its own module?** Feature flags, workspace activation status and the onboarding flow may check subscription state. Resolved: with `IS_BILLING_ENABLED` off, `hasWorkspaceAnySubscription` is already true, so activation sets `ACTIVE` and onboarding skips `PLAN_REQUIRED`. Slice 2 makes that the only path: workspaces activate straight to `ACTIVE`, and the plan, book-call and suspension branches go.

**How is server config changed without the admin panel?** Through env vars only. Confirm in slice 2 that no setting you need is only editable in the database through the admin panel.

**Does Google login share code with Microsoft that slice 3 might break?** `connected-account` serves both login and sync. Slice 3 removes only the Microsoft-specific strategies, controllers and drivers.

**What is "jev" in the lead-classification goal?** Unresolved. Needed for the follow-up outreach PRD, not for this one.

**Historical upgrade commands that import removed code.** Resolved, as in the first slim pass: delete them, and add one command in the current version folder that drops the removed tables.
