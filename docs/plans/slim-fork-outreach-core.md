# Plan: Slim fork to an outreach core

> Source: docs/prds/slim-fork-outreach-core.md
> Label: project:slim-fork-outreach-core
> Feature branch: feature/slim-fork-outreach-core

The fork becomes a single-owner outreach CRM. Removed: the marketing and docs packages, the SaaS layer (billing, credits, enterprise, admin panel, impersonation, SSO, custom and public domains), Microsoft and IMAP/SMTP/CalDAV mail, Sentry, telemetry and usage analytics, and a few AI edges. Work lives in `twenty-server` (`engine/core-modules`, `engine/metadata-modules/ai`, `modules/messaging`, `modules/calendar`, `modules/connected-account`), `twenty-front` (`modules/settings`, `modules/auth`, `modules/onboarding`, `modules/ai`), `twenty-shared`, root config and `.github`.

Definitions are frozen once tickets are cut: changing one is a `contract-change` issue that blocks dependent work, never a quiet edit.

## Phases

1. [Drop marketing and docs packages](#phase-1-drop-marketing-and-docs-packages)
2. [Single-owner instance](#phase-2-single-owner-instance)
3. [Gmail-only email](#phase-3-gmail-only-email)
4. [Trim telemetry and AI edges](#phase-4-trim-telemetry-and-ai-edges)

## Phase 1: Drop marketing and docs packages

Journeys: J1, J8

**Glossary**

- **Removed package**: `twenty-website` or `twenty-docs`, deleted with `ci-docs`, `docs-i18n-push`, `docs-i18n-pull`, `ci-website`, `website-i18n-push`, `website-i18n-pull` and `website-preview-dispatch` workflows, `.github/crowdin-docs.yml`, `.github/crowdin-website.yml`, and their `nx.json` and `knip.json` entries.
- **Recovery record section**: a new `## Outreach core slim` section in `docs/removed-app-platform.md`, using the existing table shape. Phases 2 to 4 append rows to it.

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
      "packages/twenty-e2e-testing",
      "packages/twenty-shared",
      "packages/twenty-oxlint-rules"
    ]
  }
}
```

```markdown
<!-- docs/removed-app-platform.md -->
## Outreach core slim

| Name | Paths | Last commit | Restore | Also needs |
| ---- | ----- | ----------- | ------- | ---------- |
| <package or module> | <paths> | <sha> | `git checkout <sha> -- <paths>` | <other rows, env vars, dropped tables> |
```

## Phase 2: Single-owner instance

Journeys: J2, J3, J4

**Glossary**

- **Single-owner activation**: a new workspace goes from `ONGOING_CREATION` to `ACTIVE` with no subscription check. `CREATED` stays as the pre-activation state it already is. `SUSPENDED` no longer exists.
- **Dropped tables** (core schema): `billingCreditGrant`, `billingCustomer`, `billingEntitlement`, `billingMeter`, `billingPrice`, `billingProduct`, `billingSubscription`, `billingSubscriptionItem`, `usageLimit`, `workspaceSSOIdentityProvider`, `publicDomain`.
- **Removed modules**: `billing`, `billing-webhook`, `usage-limit`, `stripe`, `enterprise`, `admin-panel`, `sso`, `public-domain`, `dns-manager`, `cloudflare`, `ai/ai-billing`, plus the SAML and OIDC strategies, guards and `sso-auth.controller`. On the front: `settings/billing`, `settings/usage`, `settings/enterprise`, `settings/admin-panel`, `SettingsEnterpriseFeatureGateCard`, and the SSO and custom-domain settings pages.
- **Removed config**: the `BILLING_CONFIG` and `CLOUDFLARE_CONFIG` groups with all their variables, plus `ENTERPRISE_KEY`, `ENTERPRISE_VALIDITY_TOKEN`, `ENTERPRISE_API_URL`, `ENTERPRISE_INSTANCE_TYPE` and `PUBLIC_DOMAIN_URL`.
- **Kept**: `subdomain`, `IS_MULTIWORKSPACE_ENABLED`, approved access domains, 2FA, `keyValuePair`, workspace AI model tiers.

**New**

```ts
// packages/twenty-server/src/database/commands/upgrade-version-command/2-48/2-48-instance-command-fast-<epoch-ms>-drop-saas-layer.ts
// <epoch-ms> is greater than 1793824525473
export class DropSaasLayerFastInstanceCommand implements FastInstanceCommand {
  up(queryRunner: QueryRunner): Promise<void>;
  down(queryRunner: QueryRunner): Promise<void>;
}
```

**Modified**

```ts
// packages/twenty-shared/src/workspace/types/WorkspaceActivationStatus.ts
export enum WorkspaceActivationStatus {
  ONGOING_CREATION = 'ONGOING_CREATION',
  PENDING_CREATION = 'PENDING_CREATION',
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

```ts
// packages/twenty-server/src/engine/core-modules/workspace/workspace.entity.ts
export class WorkspaceEntity {
  activationStatus: WorkspaceActivationStatus;
  subdomain: string;
  isGoogleAuthEnabled: boolean;
  isGoogleAuthBypassEnabled: boolean;
  isPasswordAuthEnabled: boolean;
  isPasswordAuthBypassEnabled: boolean;
  isMicrosoftAuthEnabled: boolean;
  isMicrosoftAuthBypassEnabled: boolean;
  isTwoFactorAuthenticationEnforced: boolean;
  approvedAccessDomains: Relation<ApprovedAccessDomainEntity[]>;
  emailingDomains: Relation<EmailingDomainEntity[]>;
  keyValuePairs: Relation<KeyValuePairEntity[]>;
  // remaining columns unchanged; no suspendedAt, customDomain, isCustomDomainEnabled,
  // workspaceSsoIdentityProviders or publicDomains, and no cloudflare import
}
```

```ts
// packages/twenty-server/src/engine/core-modules/user/user.entity.ts
export class UserEntity {
  disabled: boolean;
  // remaining columns unchanged; no canImpersonate or canAccessFullAdminPanel
}
```

```ts
// packages/twenty-server/src/engine/core-modules/application/application.entity.ts
export class ApplicationEntity extends WorkspaceRelatedEntity {
  // columns and relations unchanged; no primaryPublicDomainId or publicDomains
}
```

```ts
// packages/twenty-server/src/engine/core-modules/app-token/app-token.entity.ts
export enum AppTokenType {
  RefreshToken = 'REFRESH_TOKEN',
  CodeChallenge = 'CODE_CHALLENGE',
  AuthorizationCode = 'AUTHORIZATION_CODE',
  PasswordResetToken = 'PASSWORD_RESET_TOKEN',
  InvitationToken = 'INVITATION_TOKEN',
  OnboardingInvitationToken = 'ONBOARDING_INVITATION_TOKEN',
  EmailVerificationToken = 'EMAIL_VERIFICATION_TOKEN',
  TwoFactorAuthenticationRecoveryCode = 'TWO_FACTOR_AUTHENTICATION_RECOVERY_CODE',
}
```

```ts
// packages/twenty-server/src/engine/core-modules/workspace/types/workspace.type.ts
export enum AuthProviderEnum {
  Google = 'google',
  Microsoft = 'microsoft',
  Password = 'password',
}
```

```ts
// packages/twenty-server/src/engine/core-modules/workspace/dtos/public-workspace-data.dto.ts
@ObjectType('AuthProviders')
export class AuthProvidersDTO {
  google: boolean;
  magicLink: boolean;
  password: boolean;
  microsoft: boolean;
}
// no SsoIdentityProviderDTO
```

```ts
// packages/twenty-server/src/engine/core-modules/onboarding/enums/onboarding-status.enum.ts
export enum OnboardingStatus {
  WORKSPACE_ACTIVATION = 'WORKSPACE_ACTIVATION',
  PROFILE_CREATION = 'PROFILE_CREATION',
  SYNC_EMAIL = 'SYNC_EMAIL',
  INVITE_TEAM = 'INVITE_TEAM',
  COMPLETED = 'COMPLETED',
}
```

```ts
// packages/twenty-server/src/engine/metadata-modules/ai/ai-models/types/ai-model-cost-config.type.ts
// deleted; AI model, provider-model and evaluation-model configs carry no token or per-minute cost fields
```

```ts
// packages/twenty-shared/src/types/SettingsPath.ts
// no Billing*, Usage*, AiUsageUserDetail, Enterprise, CustomDomain, NewSsoIdentityProvider
// or AdminPanel* members; Subdomain, Security, NewApprovedAccessDomain and Logs stay
```

## Phase 3: Gmail-only email

Journeys: J5

**Glossary**

- **Google-only provider**: Google is the only OAuth provider for login and for mail and calendar connected accounts.
- **Removed drivers**: messaging `microsoft`, `imap`, `smtp`; calendar `microsoft-calendar`, `caldav`; connected-account `oauth2-client-manager`, `refresh-tokens-manager` and `webhook-subscription-manager` `microsoft` drivers; `engine/core-modules/imap-smtp-caldav-connection`; Microsoft auth strategies, guards, controllers and `microsoft-apis.service`. The app-email SMTP driver (`core-modules/email/drivers/smtp.driver.ts`) stays.
- **Removed config**: the `MICROSOFT_AUTH` group with all its variables, `IS_IMAP_SMTP_CALDAV_ENABLED` and `IS_IMAP_SMTP_CALDAV_CONNECTION_TEST_ENABLED`.

**New**

```ts
// packages/twenty-server/src/database/commands/upgrade-version-command/2-48/2-48-instance-command-fast-<epoch-ms>-drop-microsoft-auth.ts
// <epoch-ms> is greater than DropSaasLayerFastInstanceCommand's
export class DropMicrosoftAuthFastInstanceCommand implements FastInstanceCommand {
  up(queryRunner: QueryRunner): Promise<void>;
  down(queryRunner: QueryRunner): Promise<void>;
}
```

**Modified**

```ts
// packages/twenty-shared/src/types/ConnectedAccountProvider.ts
export enum ConnectedAccountProvider {
  GOOGLE = 'google',
  EMAIL_GROUP = 'email_group',
  APP = 'app',
}
```

```ts
// packages/twenty-server/src/engine/core-modules/workspace/types/workspace.type.ts
export enum AuthProviderEnum {
  Google = 'google',
  Password = 'password',
}
```

```ts
// packages/twenty-server/src/engine/core-modules/workspace/workspace.entity.ts
// no isMicrosoftAuthEnabled or isMicrosoftAuthBypassEnabled; AuthProvidersDTO and
// AuthBypassProvidersDTO have no microsoft field
```

```ts
// packages/twenty-shared/src/constants/AccountTypes.ts
// deleted, with EmailDraftingProviders holding GOOGLE only
// SettingsPath has no NewImapSmtpCaldavConnection or EditImapSmtpCaldavConnection
```

## Phase 4: Trim telemetry and AI edges

Journeys: J6, J7

**Glossary**

- **Optional ClickHouse**: `database/clickhouse`, `event-logs` and `modules/emailing` campaign engagement stay. They are inactive until `CLICKHOUSE_URL` is set, and `CampaignEngagementEventService.isAvailable()` guards the campaign path.
- **Removed modules**: `sentry` (server and front), `telemetry`, `metrics`, `usage` analytics, front `analytics`, `code-interpreter` and `code-interpreter-tool`, `search-help-center-tool`, `ai/ai-workspace-stats`, front `ai/dictation`.
- **Removed config**: the `CODE_INTERPRETER_CONFIG` group, `SENTRY_*`, `TELEMETRY_ENABLED`, `METER_DRIVER`, `METER_EXPORT_INTERVAL_MS`, `METER_TEMPORALITY`, `ANALYTICS_ENABLED`, `USAGE_ROLLUP_FLUSH_INTERVAL_MS`. `ANALYTICS_CONFIG` keeps `CLICKHOUSE_URL`.

**Modified**

```ts
// packages/twenty-server/src/engine/core-modules/tool-provider/providers/action-tool.provider.ts
// toolMap holds the http, send-email, email, calendar, file-upload, share-record and
// output-navigation tools; no 'code_interpreter' or 'search_help_center' entries
```

```ts
// packages/twenty-server/src/engine/core-modules/tool-provider/constants/common-preload-tools.const.ts
export const COMMON_PRELOAD_TOOLS: string[] = [];
```

```ts
// packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-skill.constant.ts
// no 'code-interpreter' skill; standard agent and chat system prompts don't mention
// search_help_center or the code interpreter
```

## Notes

- Phases run in order. Phase 1 changes no product behaviour. Each later phase appends its rows to the recovery record before deleting code.
- Upgrade commands go only in `2-48/`, with epoch-ms timestamps strictly increasing across phases. Historical upgrade commands that import removed code are deleted. Entity changes are generated with `database:migrate:generate`.
- Activation logic lives in `workspace.service.ts`. Every cron that filters on `activationStatus: ACTIVE` (workflow enqueue, messaging and calendar import, emailing stale, agent cron trigger) keeps working unchanged.
- Agents, skills, AI chat, workflow AI actions, tool providers, MCP, webhooks, API keys, approved access domains and campaigns keep their tables. No phase changes them beyond the removals listed.
