# Move the backend to Go

## Problem

The maintainer owns this single-owner outreach CRM, but its backend is ~566k lines of NestJS, TypeORM and BullMQ they don't want to build new outreach and AI features in; they want a Go backend, written to their own Go standards with sqlc, that they understand end to end.

## Why

Fluency and ownership, not performance. The AI core and the outreach features planned on top of it (rubric classification, AI-filled templates, agents for repetitive work) are where the fork is going, and building them is faster in a codebase that follows the maintainer's Go standards (`go-idiomatic`, `go-testing`, `postgres-best-practices`). A big-bang rewrite would leave no working app for months, so the Go backend replaces Node piece by piece while the app keeps working, and the work can stop at any point with a usable system.

## Goal

A Go backend in `packages/twenty-server-go` serving the same front end over the same GraphQL contract, with data access through sqlc, jobs on River in Postgres, AI on the official Anthropic and OpenAI Go SDKs, and the schema owned by goose migrations. At the end, the Node server, its worker and Valkey are gone, and the app runs on Postgres plus three Go binaries.

## Concepts

**Strangler front door.** `cmd/api` listens on :3000 in front of the Node server. It handles the GraphQL operations Go owns, picked by operation name, and proxies everything else to Node. Each module moves by adding its operations to the owned set and deleting the Node code.

**Modular monolith.** Go modules (records, metadata, ai, workflow, messaging, auth, ...) live under `internal/<module>/`, each with its own `store` package that alone imports pgx and its sqlc output. A module reaches another module's data through that module's Go interface, never its SQL. A gqlgen GraphQL layer sits on top of the module services.

**Frozen data model.** Objects and fields change only through migrations the maintainer writes. Settings > Data model is read-only. This removes user-defined objects and fields from the UI and departs from the outreach-core PRD; it needs its own ADR.

**Schema owned by goose.** From the first slice, goose owns every schema change, starting from a squashed baseline of today's schema. Node's TypeORM migrations and upgrade-command runners are retired. A migration that changes workspace tables also writes the matching `core."objectMetadata"`/`"fieldMetadata"` rows and flushes Node's metadata cache, so Node keeps working until it is gone. Needs an ADR.

**Pinned workspace.** The baseline seeds the one workspace with a fixed UUID (the current one), so its schema name `workspace_<base36 id>` is a constant. Signup joins that workspace; creating workspaces is removed.

**Generated model.** A `go generate` step reads the metadata of a migrated database and emits the gqlgen SDL, the column whitelists and the per-object sqlc queries, all committed. CI regenerates and fails on a diff.

**Filter compiler.** List, aggregate and group-by queries take arbitrary view filters and sorts, which sqlc cannot express. One small compiler in the records store turns the GraphQL filter into a parameterised WHERE and ORDER BY over whitelisted columns. Everything else is sqlc.

**Parity proof.** Each moved GraphQL operation has a golden test comparing Go's JSON to Node's for the same fixture, store code is tested against real Postgres through `internal/pgtest`, and the Playwright e2e suite always runs through the Go front door.

## Journeys

### J1. Start a fresh instance through the Go front door

Surface: CLI

1. Run `cmd/migrate` against an empty database.
2. Start the Go api, the Node server and the worker, and open the app on :3000.
3. Sign up with email and password.

→ The owner lands in the pinned workspace, every request passes through the Go front door, and the app behaves as it did on Node.

### J2. Work with people served by Go

Surface: UI

1. Open People and filter and sort the list.
2. Create a person, edit their name and email, then delete them.
3. Reload the page.

→ The list, record page and changes all come from Go (visible in the api's request log), and the results match what Node returned.

### J3. Add a field with a migration

Surface: CLI

1. Write a goose migration that adds a select field to Person, with its metadata rows.
2. Run `cmd/migrate` and `go generate`.
3. Open a person record, then Settings > Data model.

→ The new field shows and saves on the person, Data model lists it, and there is no way to create, edit or delete an object or field from the UI.

### J4. Prove a moved operation matches Node

Surface: CLI

1. Run the Go tests.
2. Run the Playwright suite against :3000.

→ Store tests pass against real Postgres, each moved operation's golden JSON matches Node's, and the e2e suite is green.

### J5. Work across all records on Go

Surface: UI

1. Open companies, opportunities, notes and tasks, and switch between their saved views.
2. Group a view by a select field and read its aggregate counts.
3. Open a company's timeline.

→ Every record list, view, group-by, aggregate and timeline request is served by Go, and Node handles no record or metadata reads.

### J6. Chat with AI served by Go

Surface: UI

1. Set only `ANTHROPIC_API_KEY` (or an OpenAI key) in the env.
2. Ask the AI chat to find a person and summarise them.
3. Reload the page mid-way through a long answer.

→ The answer streams in, the record tool call is shown, and after the reload the thread shows everything produced up to that point.

### J7. Use CRM tools from an MCP client

Surface: API

1. Create an API key in Settings.
2. Add the MCP endpoint to an MCP client with that key.
3. Ask the client to list recent people.

→ The client sees the same tools the in-app agent has and gets the records back, served by Go.

### J8. Classify a lead in a workflow on Go

Surface: UI

1. Create a workflow triggered by "Person created" with a Classify step whose output updates a select field.
2. Activate it and create a person.
3. Open the person and the workflow run.

→ The person is classified, the run is successful in run history, and the run executed as a River job in the Go worker.

### J9. Sync and send email on Go

Surface: UI

1. Connect a Google account in Settings > Accounts.
2. Wait for mail and calendar to sync, then send an email to a person.
3. Send a campaign to a list.

→ Mail and events sync, the sent email is on the person's timeline, the campaign is delivered, and none of it touches BullMQ.

### J10. Log in on Go

Surface: UI

1. While logged in from before the switch, reload the app.
2. Log out and log in with email and password, with 2FA.
3. Log out and log in with Google.

→ The existing session still works, and both logins and the token refresh are served by Go.

### J11. Run with no Node or Valkey

Surface: CLI

1. Stop the Node server and worker and remove Valkey from the compose file.
2. Start `cmd/api` and `cmd/worker`.
3. Click through records, settings, AI chat, workflows and email.

→ The app works fully on Postgres plus the Go binaries, and `packages/twenty-server` is deleted from the repo.

## Delivery slices

1. **Go front door with people.** Go fronts the app, goose owns the schema from a squashed baseline with the pinned workspace, Go verifies Node-issued JWTs, Data model is read-only, and Go serves the Person record operations with sqlc and the filter compiler, proven by golden and e2e tests. Node's BullMQ moves from Redis to Valkey. Call recording and onboarding invite suggestions are cut before the baseline and recorded in `docs/removed-app-platform.md`. Journeys: J1, J2, J3, J4
2. **All records on Go.** Every standard object, views, group-by, aggregates, the timeline and metadata reads move to Go. Journeys: J5
3. **AI on Go.** Chat (the same start mutation, `onAgentChatEvent` subscription and catchup query the front end uses today, fed by an in-process broker in `cmd/api`), agents, skills, the tool registry and MCP move to Go on the official Anthropic and OpenAI SDKs. Sending email through Gmail (connected accounts, token refresh, send and draft) moves with it, since the send-email tool and workflow email actions need it. Journeys: J6, J7
4. **Workflows on Go.** Workflow runs, triggers and actions, including Classify, AI Agent and Mail sender, run as River jobs. Journeys: J8
5. **Messaging on Go.** Gmail and Google Calendar sync and campaigns move to Go and River. Journeys: J9
6. **Auth on Go.** Login, refresh, Google OAuth and 2FA move to Go with the same token format. Journeys: J10
7. **Node removed.** The Node server, worker, BullMQ and Valkey are deleted. Journeys: J11

## Out of scope

- Moving the front end off GraphQL or rewriting its data layer.
- User-defined objects and fields from the UI.
- Server-side translations. Go server strings are English only; the front end's Lingui catalogs are untouched.
- AI providers other than Anthropic and OpenAI-compatible APIs (Google, Bedrock and Azure are dropped).
- A shared cache. Go reads Postgres directly and adds an in-process cache only where profiling shows a need.
- Converting Postgres ENUMs to text + CHECK while Node still uses the table. Each table converts once Node has left it.
- Performance work, and preserving data in existing deployments (there are none).

## Open questions

**Keep the SES/Resend campaign webhooks (`modules/messaging-webhooks`)?** Unresolved. Decided in slice 5, depending on whether campaign tracking needs them.

**How does Go render `twenty-emails` templates?** Unresolved. Either a small Node render step or templates pre-rendered at build time. Decided in slice 5.

**Who owns the schema while both runtimes run?** Resolved: goose, from slice 1, with metadata rows written in the same migration and Node's cache flushed after it.

**How does sqlc cope with tables generated at runtime?** Resolved: the data model is frozen, so tables are known at build time; only view filters and sorts go through the filter compiler.

**Which queue replaces BullMQ?** Resolved: River on Postgres, whose transactional enqueue also serves as the outbox for work across modules. Node's BullMQ runs on Valkey until slice 7.

**Does a chat run survive a closed tab?** Resolved: no. The start mutation runs the agent loop in a goroutine in `cmd/api`, chunks reach the browser through the `onAgentChatEvent` GraphQL subscription via an in-process broker, and each chunk is saved so the catchup query restores the thread after a reload. No River job and no Redis. Unattended agent runs from workflows are River jobs.
