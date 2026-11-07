import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const TIMESTAMP_COLUMNS = `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`;

const DROPPED_TABLES = [
  'billingSubscriptionItem',
  'billingSubscription',
  'billingPrice',
  'billingProduct',
  'billingMeter',
  'billingEntitlement',
  'billingCustomer',
  'billingCreditGrant',
  'usageLimit',
  'workspaceSSOIdentityProvider',
  'publicDomain',
];

const DROPPED_ENUM_TYPES = [
  'billingCreditGrant_type_enum',
  'billingMeter_status_enum',
  'billingMeter_eventtimewindow_enum',
  'billingPrice_taxbehavior_enum',
  'billingPrice_type_enum',
  'billingPrice_billingscheme_enum',
  'billingPrice_tiersmode_enum',
  'billingPrice_usagetype_enum',
  'billingPrice_interval_enum',
  'billingSubscription_status_enum',
  'billingSubscription_interval_enum',
  'billingSubscription_collectionmethod_enum',
  'workspaceSSOIdentityProvider_status_enum',
  'workspaceSSOIdentityProvider_type_enum',
];

const RECREATE_DROPPED_TABLES = [
  `CREATE TYPE "core"."workspaceSSOIdentityProvider_status_enum" AS ENUM('Active', 'Inactive', 'Error')`,
  `CREATE TYPE "core"."workspaceSSOIdentityProvider_type_enum" AS ENUM('OIDC', 'SAML')`,
  `CREATE TABLE "core"."workspaceSSOIdentityProvider" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "status" "core"."workspaceSSOIdentityProvider_status_enum" NOT NULL DEFAULT 'Active', "workspaceId" uuid NOT NULL, ${TIMESTAMP_COLUMNS}, "type" "core"."workspaceSSOIdentityProvider_type_enum" NOT NULL DEFAULT 'OIDC', "issuer" character varying NOT NULL, "clientID" character varying, "clientSecret" character varying, "ssoURL" character varying, "certificate" character varying, "fingerprint" character varying, CONSTRAINT "PK_a4e3928eb641e7cd612042b628b" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."workspaceSSOIdentityProvider" ADD CONSTRAINT "FK_bc8d8855198de1fbc32fba8df93" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `CREATE TABLE "core"."publicDomain" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), ${TIMESTAMP_COLUMNS}, "domain" character varying NOT NULL, "isValidated" boolean NOT NULL DEFAULT false, "workspaceId" uuid NOT NULL, "applicationId" uuid NOT NULL, CONSTRAINT "UQ_1311e24fbd049c561c53a274f2a" UNIQUE ("domain"), CONSTRAINT "PK_ff55a0f1bc3b6e2c32feff734b1" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_PUBLIC_DOMAIN_APPLICATION_ID" ON "core"."publicDomain" ("applicationId")`,
  `ALTER TABLE "core"."publicDomain" ADD CONSTRAINT "FK_7e9ca5fd7aa30b8396ea3d1d6be" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "core"."publicDomain" ADD CONSTRAINT "FK_39f1ad35993f3994cd5400e81a0" FOREIGN KEY ("applicationId") REFERENCES "core"."application"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `CREATE TABLE "core"."usageLimit" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resourceType" character varying NOT NULL, "operationType" character varying NOT NULL, "spenderType" character varying NOT NULL, "spenderId" character varying NOT NULL DEFAULT '', "limitKind" character varying NOT NULL, "periodCount" integer NOT NULL, "periodUnit" character varying NOT NULL, "unit" character varying NOT NULL, "limitValue" bigint NOT NULL, "burstValue" bigint, "isInstanceOverride" boolean NOT NULL DEFAULT false, ${TIMESTAMP_COLUMNS}, CONSTRAINT "UQ_USAGE_LIMIT_SCOPE" UNIQUE ("workspaceId", "resourceType", "operationType", "spenderType", "spenderId", "limitKind", "periodCount", "periodUnit", "unit"), CONSTRAINT "PK_aa789af8757d2ef28a0416df290" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."usageLimit" ADD CONSTRAINT "FK_262e7eabfa66b9724f7bf45628e" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `CREATE TYPE "core"."billingCreditGrant_type_enum" AS ENUM('ROLLOVER', 'ONBOARDING_REWARD', 'COMPENSATION', 'SALES', 'PURCHASE')`,
  `CREATE TABLE "core"."billingCreditGrant" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amountMicro" bigint NOT NULL, "type" "core"."billingCreditGrant_type_enum" NOT NULL, "effectiveAt" TIMESTAMP WITH TIME ZONE NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "revokedByUserId" uuid, "grantedByUserId" uuid, "reason" character varying(500), "idempotencyKey" character varying, "sourceGrantId" uuid, ${TIMESTAMP_COLUMNS}, CONSTRAINT "PK_billingCreditGrant" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_BILLING_CREDIT_GRANT_WORKSPACE_ID_EXPIRES_AT" ON "core"."billingCreditGrant" ("workspaceId", "expiresAt")`,
  `CREATE UNIQUE INDEX "IDX_BILLING_CREDIT_GRANT_IDEMPOTENCY_KEY_UNIQUE" ON "core"."billingCreditGrant" ("idempotencyKey")`,
  `ALTER TABLE "core"."billingCreditGrant" ADD CONSTRAINT "FK_billingCreditGrant_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."billingCustomer" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "stripeCustomerId" character varying NOT NULL, "hasPaymentMethod" boolean, CONSTRAINT "UQ_billingCustomer_stripeCustomerId" UNIQUE ("stripeCustomerId"), CONSTRAINT "PK_billingCustomer" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX "IDX_BILLING_CUSTOMER_WORKSPACE_ID_UNIQUE" ON "core"."billingCustomer" ("workspaceId")`,
  `ALTER TABLE "core"."billingCustomer" ADD CONSTRAINT "FK_billingCustomer_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."billingEntitlement" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" text NOT NULL, "stripeCustomerId" character varying NOT NULL, "value" boolean NOT NULL, ${TIMESTAMP_COLUMNS}, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "IDX_BILLING_ENTITLEMENT_KEY_WORKSPACE_ID_UNIQUE" UNIQUE ("key", "workspaceId"), CONSTRAINT "PK_billingEntitlement" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."billingEntitlement" ADD CONSTRAINT "FK_billingEntitlement_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."billingEntitlement" ADD CONSTRAINT "FK_billingEntitlement_stripeCustomerId" FOREIGN KEY ("stripeCustomerId") REFERENCES "core"."billingCustomer"("stripeCustomerId") ON DELETE CASCADE ON UPDATE CASCADE`,
  `CREATE TYPE "core"."billingMeter_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
  `CREATE TYPE "core"."billingMeter_eventtimewindow_enum" AS ENUM('DAY', 'HOUR')`,
  `CREATE TABLE "core"."billingMeter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "stripeMeterId" character varying NOT NULL, "displayName" character varying NOT NULL, "eventName" character varying NOT NULL, "status" "core"."billingMeter_status_enum" NOT NULL, "customerMapping" jsonb NOT NULL, "eventTimeWindow" "core"."billingMeter_eventtimewindow_enum", "valueSettings" jsonb NOT NULL, CONSTRAINT "UQ_billingMeter_stripeMeterId" UNIQUE ("stripeMeterId"), CONSTRAINT "PK_billingMeter" PRIMARY KEY ("id"))`,
  `CREATE TABLE "core"."billingProduct" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "active" boolean NOT NULL, "description" text NOT NULL DEFAULT '', "name" character varying NOT NULL, "taxCode" text, "images" jsonb NOT NULL DEFAULT '[]', "marketingFeatures" jsonb NOT NULL DEFAULT '[]', "stripeProductId" character varying NOT NULL, "defaultStripePriceId" text, "metadata" jsonb NOT NULL DEFAULT '{}', "unitLabel" text, "url" text, CONSTRAINT "UQ_billingProduct_stripeProductId" UNIQUE ("stripeProductId"), CONSTRAINT "PK_billingProduct" PRIMARY KEY ("id"))`,
  `CREATE TYPE "core"."billingPrice_taxbehavior_enum" AS ENUM('EXCLUSIVE', 'INCLUSIVE', 'UNSPECIFIED')`,
  `CREATE TYPE "core"."billingPrice_type_enum" AS ENUM('ONE_TIME', 'RECURRING')`,
  `CREATE TYPE "core"."billingPrice_billingscheme_enum" AS ENUM('PER_UNIT', 'TIERED')`,
  `CREATE TYPE "core"."billingPrice_usagetype_enum" AS ENUM('METERED', 'LICENSED')`,
  `CREATE TYPE "core"."billingPrice_interval_enum" AS ENUM('day', 'month', 'week', 'year')`,
  `CREATE TABLE "core"."billingPrice" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "stripePriceId" character varying NOT NULL, "active" boolean NOT NULL, "stripeProductId" character varying, "currency" character varying NOT NULL, "nickname" text, "taxBehavior" "core"."billingPrice_taxbehavior_enum" NOT NULL, "type" "core"."billingPrice_type_enum" NOT NULL, "billingScheme" "core"."billingPrice_billingscheme_enum" NOT NULL, "currencyOptions" jsonb, "tiers" jsonb, "recurring" jsonb, "transformQuantity" jsonb, "unitAmountDecimal" text, "unitAmount" numeric, "stripeMeterId" text, "metadata" jsonb NOT NULL DEFAULT '{}', "usageType" "core"."billingPrice_usagetype_enum" NOT NULL, "interval" "core"."billingPrice_interval_enum" NOT NULL, CONSTRAINT "UQ_billingPrice_stripePriceId" UNIQUE ("stripePriceId"), CONSTRAINT "PK_billingPrice" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."billingPrice" ADD CONSTRAINT "FK_billingPrice_stripeProductId" FOREIGN KEY ("stripeProductId") REFERENCES "core"."billingProduct"("stripeProductId") ON DELETE CASCADE`,
  `ALTER TABLE "core"."billingPrice" ADD CONSTRAINT "FK_billingPrice_stripeMeterId" FOREIGN KEY ("stripeMeterId") REFERENCES "core"."billingMeter"("stripeMeterId")`,
  `CREATE TYPE "core"."billingSubscription_status_enum" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid')`,
  `CREATE TYPE "core"."billingSubscription_interval_enum" AS ENUM('day', 'month', 'week', 'year')`,
  `CREATE TYPE "core"."billingSubscription_collectionmethod_enum" AS ENUM('CHARGE_AUTOMATICALLY', 'SEND_INVOICE')`,
  `CREATE TABLE "core"."billingSubscription" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "stripeCustomerId" character varying NOT NULL, "stripeSubscriptionId" character varying NOT NULL, "status" "core"."billingSubscription_status_enum" NOT NULL, "interval" "core"."billingSubscription_interval_enum", "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "currency" character varying NOT NULL DEFAULT 'USD', "currentPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "currentPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "previousPeriodStart" TIMESTAMP WITH TIME ZONE, "metadata" jsonb NOT NULL DEFAULT '{}', "phases" jsonb NOT NULL DEFAULT '[]', "cancelAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "automaticTax" jsonb, "cancellationDetails" jsonb, "collectionMethod" "core"."billingSubscription_collectionmethod_enum" NOT NULL DEFAULT 'CHARGE_AUTOMATICALLY', "endedAt" TIMESTAMP WITH TIME ZONE, "trialStart" TIMESTAMP WITH TIME ZONE, "trialEnd" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_billingSubscription_stripeSubscriptionId" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "PK_billingSubscription" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX "IDX_BILLING_SUBSCRIPTION_WORKSPACE_ID_UNIQUE" ON "core"."billingSubscription" ("workspaceId") WHERE status IN ('trialing', 'active', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')`,
  `ALTER TABLE "core"."billingSubscription" ADD CONSTRAINT "FK_billingSubscription_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."billingSubscriptionItem" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deletedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, "billingSubscriptionId" uuid NOT NULL, "stripeSubscriptionId" character varying, "metadata" jsonb NOT NULL DEFAULT '{}', "billingThresholds" jsonb, "stripeProductId" character varying NOT NULL, "stripePriceId" character varying NOT NULL, "stripeSubscriptionItemId" character varying NOT NULL, "quantity" numeric, CONSTRAINT "UQ_billingSubscriptionItem_stripeSubscriptionItemId" UNIQUE ("stripeSubscriptionItemId"), CONSTRAINT "IDX_BILLING_SUBSCRIPTION_ITEM_BILLING_SUBSCRIPTION_ID_STRIPE_PRODUCT_ID_UNIQUE" UNIQUE ("billingSubscriptionId", "stripeProductId"), CONSTRAINT "PK_billingSubscriptionItem" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."billingSubscriptionItem" ADD CONSTRAINT "FK_billingSubscriptionItem_billingSubscriptionId" FOREIGN KEY ("billingSubscriptionId") REFERENCES "core"."billingSubscription"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."billingSubscriptionItem" ADD CONSTRAINT "FK_billingSubscriptionItem_stripeProductId" FOREIGN KEY ("stripeProductId") REFERENCES "core"."billingProduct"("stripeProductId")`,
];

const RESTORE_DROPPED_COLUMNS = [
  `ALTER TABLE "core"."workspace" ADD "suspendedAt" TIMESTAMP WITH TIME ZONE, ADD "customDomain" character varying, ADD "isCustomDomainEnabled" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "core"."workspace" ADD CONSTRAINT "UQ_900f0a3eb789159c26c8bcb39cd" UNIQUE ("customDomain")`,
  `ALTER TABLE "core"."user" ADD "canImpersonate" boolean NOT NULL DEFAULT false, ADD "canAccessFullAdminPanel" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "core"."application" ADD "primaryPublicDomainId" uuid`,
  `ALTER TABLE "core"."application" ADD CONSTRAINT "FK_38ac5dccee353ca07862a5a94bf" FOREIGN KEY ("primaryPublicDomainId") REFERENCES "core"."publicDomain"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
];

const swapActivationStatusEnum = async (
  queryRunner: QueryRunner,
  {
    enumValues,
    castExpression,
  }: { enumValues: string; castExpression: string },
): Promise<void> => {
  const checkConstraints: { conname: string; definition: string }[] =
    await queryRunner.query(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
         FROM pg_constraint
         WHERE conrelid = 'core.workspace'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%activationStatus%'`,
    );

  for (const { conname } of checkConstraints) {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" DROP CONSTRAINT "${conname}"`,
    );
  }

  await queryRunner.query(
    `ALTER TYPE "core"."workspace_activationStatus_enum" RENAME TO "workspace_activationStatus_enum_old"`,
  );
  await queryRunner.query(
    `CREATE TYPE "core"."workspace_activationStatus_enum" AS ENUM(${enumValues})`,
  );
  await queryRunner.query(
    `ALTER TABLE "core"."workspace" ALTER COLUMN "activationStatus" DROP DEFAULT`,
  );
  await queryRunner.query(
    `ALTER TABLE "core"."workspace" ALTER COLUMN "activationStatus" TYPE "core"."workspace_activationStatus_enum" USING (${castExpression})::"core"."workspace_activationStatus_enum"`,
  );
  await queryRunner.query(
    `ALTER TABLE "core"."workspace" ALTER COLUMN "activationStatus" SET DEFAULT 'INACTIVE'`,
  );
  await queryRunner.query(
    `DROP TYPE "core"."workspace_activationStatus_enum_old"`,
  );

  for (const { conname, definition } of checkConstraints) {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" ADD CONSTRAINT "${conname}" ${definition}`,
    );
  }
};

@RegisteredInstanceCommand('2.48.0', 1794066000000)
export class DropSaasLayerFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."application" DROP COLUMN IF EXISTS "primaryPublicDomainId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" DROP COLUMN IF EXISTS "suspendedAt", DROP COLUMN IF EXISTS "customDomain", DROP COLUMN IF EXISTS "isCustomDomainEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."user" DROP COLUMN IF EXISTS "canImpersonate", DROP COLUMN IF EXISTS "canAccessFullAdminPanel"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${DROPPED_TABLES.map((table) => `"core"."${table}"`).join(', ')}`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS ${DROPPED_ENUM_TYPES.map((type) => `"core"."${type}"`).join(', ')}`,
    );
    await queryRunner.query(
      `UPDATE "core"."workspace" SET "activationStatus" = 'INACTIVE' WHERE "activationStatus" = 'SUSPENDED'`,
    );
    await swapActivationStatusEnum(queryRunner, {
      enumValues:
        "'ONGOING_CREATION', 'PENDING_CREATION', 'CREATED', 'ACTIVE', 'INACTIVE'",
      castExpression: '"activationStatus"::"text"',
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await swapActivationStatusEnum(queryRunner, {
      enumValues:
        "'ONGOING_CREATION', 'PENDING_CREATION', 'CREATED', 'ACTIVE', 'INACTIVE', 'SUSPENDED'",
      castExpression: '"activationStatus"::"text"',
    });

    for (const statement of RECREATE_DROPPED_TABLES) {
      await queryRunner.query(statement);
    }

    for (const statement of RESTORE_DROPPED_COLUMNS) {
      await queryRunner.query(statement);
    }
  }
}
