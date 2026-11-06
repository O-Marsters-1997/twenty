import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

const DROPPED_APPLICATION_COLUMNS = [
  'state',
  'sourcePath',
  'packageJsonChecksum',
  'packageJsonFileId',
  'yarnLockChecksum',
  'yarnLockFileId',
  'availablePackages',
  'billing',
  'grantedCapabilities',
  'logicFunctionLayerId',
  'settingsCustomTabFrontComponentId',
  'uninstallLogicFunctionId',
  'uninstallHookCompletedForRequestedAt',
  'healthCheckLogicFunctionId',
  'canBeUninstalled',
  'autoUpgrade',
  'isSdkLayerStale',
  'sdkClientCoreChecksum',
  'frontComponentSharedDependenciesChecksum',
  'frontComponentSharedDependenciesBuiltPath',
];

const SYNCABLE_COLUMNS = `"workspaceId" uuid NOT NULL, "universalIdentifier" uuid NOT NULL, "applicationId" uuid NOT NULL`;

const TIMESTAMP_COLUMNS = `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`;

const syncableForeignKeys = (table: string) => [
  `ALTER TABLE "core"."${table}" ADD CONSTRAINT "FK_${table}_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."${table}" ADD CONSTRAINT "FK_${table}_applicationId" FOREIGN KEY ("applicationId") REFERENCES "core"."application"("id") ON DELETE CASCADE`,
  `CREATE UNIQUE INDEX "IDX_${table}_WORKSPACE_ID_UNIVERSAL_IDENTIFIER_UNIQUE" ON "core"."${table}" ("workspaceId", "universalIdentifier")`,
];

const RECREATE_DROPPED_TABLES = [
  `CREATE TABLE "core"."frontComponent" (${SYNCABLE_COLUMNS}, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "sourceComponentPath" character varying NOT NULL, "builtComponentPath" character varying NOT NULL, "componentName" character varying NOT NULL, "builtComponentChecksum" character varying NOT NULL, "isHeadless" boolean NOT NULL DEFAULT false, "widgetAvailability" jsonb NOT NULL DEFAULT '[]', "usesSdkClient" boolean NOT NULL DEFAULT false, ${TIMESTAMP_COLUMNS}, CONSTRAINT "PK_frontComponent" PRIMARY KEY ("id"))`,
  ...syncableForeignKeys('frontComponent'),
  `CREATE TABLE "core"."logicFunctionLayer" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "packageJson" jsonb NOT NULL, "yarnLock" text NOT NULL, "packageJsonChecksum" text, "yarnLockChecksum" text NOT NULL, "availablePackages" jsonb NOT NULL DEFAULT '{}', ${TIMESTAMP_COLUMNS}, CONSTRAINT "PK_logicFunctionLayer" PRIMARY KEY ("id"))`,
  `ALTER TABLE "core"."logicFunctionLayer" ADD CONSTRAINT "FK_logicFunctionLayer_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `CREATE TYPE "core"."logicFunction_executionmode_enum" AS ENUM('LIVE', 'PREBUILT')`,
  `CREATE TABLE "core"."logicFunction" (${SYNCABLE_COLUMNS}, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "sourceHandlerPath" character varying NOT NULL, "builtHandlerPath" character varying NOT NULL, "handlerName" character varying NOT NULL, "description" character varying, "runtime" character varying NOT NULL DEFAULT 'nodejs22.x', "timeoutSeconds" integer NOT NULL DEFAULT '300', "checksum" text, "isBuildUpToDate" boolean NOT NULL DEFAULT true, "executionMode" "core"."logicFunction_executionmode_enum" NOT NULL DEFAULT 'LIVE', "cronTriggerSettings" jsonb, "databaseEventTriggerSettings" jsonb, "httpRouteTriggerSettings" jsonb, "serverRouteTriggerSettings" jsonb, "toolTriggerSettings" jsonb, "workflowActionTriggerSettings" jsonb, ${TIMESTAMP_COLUMNS}, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_logicFunction_timeoutSeconds" CHECK ("timeoutSeconds" >= 1 AND "timeoutSeconds" <= 900), CONSTRAINT "PK_logicFunction" PRIMARY KEY ("id"))`,
  ...syncableForeignKeys('logicFunction'),
  `CREATE INDEX "IDX_LOGIC_FUNCTION_APPLICATION_ID" ON "core"."logicFunction" ("applicationId")`,
  `CREATE INDEX "IDX_LOGIC_FUNCTION_ID_DELETED_AT" ON "core"."logicFunction" ("id", "deletedAt")`,
  `CREATE TYPE "core"."settingsMenuItem_scope_enum" AS ENUM('WORKSPACE', 'USER')`,
  `CREATE TABLE "core"."settingsMenuItem" (${SYNCABLE_COLUMNS}, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "frontComponentId" uuid NOT NULL, "title" character varying NOT NULL, "icon" character varying, "position" double precision NOT NULL DEFAULT '0', "scope" "core"."settingsMenuItem_scope_enum" NOT NULL DEFAULT 'WORKSPACE', ${TIMESTAMP_COLUMNS}, CONSTRAINT "PK_settingsMenuItem" PRIMARY KEY ("id"))`,
  ...syncableForeignKeys('settingsMenuItem'),
  `ALTER TABLE "core"."settingsMenuItem" ADD CONSTRAINT "FK_settingsMenuItem_frontComponentId" FOREIGN KEY ("frontComponentId") REFERENCES "core"."frontComponent"("id") ON DELETE CASCADE`,
  `CREATE INDEX "IDX_SETTINGS_MENU_ITEM_WORKSPACE_ID_APPLICATION_ID" ON "core"."settingsMenuItem" ("workspaceId", "applicationId")`,
  `CREATE INDEX "IDX_SETTINGS_MENU_ITEM_FRONT_COMPONENT_ID" ON "core"."settingsMenuItem" ("frontComponentId")`,
  `CREATE TABLE "core"."connectionProvider" (${SYNCABLE_COLUMNS}, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "displayName" character varying NOT NULL, "logo" character varying, "type" character varying NOT NULL, "oauthConfig" jsonb, "onConnectLogicFunctionUniversalIdentifier" uuid, "onDisconnectLogicFunctionUniversalIdentifier" uuid, ${TIMESTAMP_COLUMNS}, CONSTRAINT "IDX_CONNECTION_PROVIDER_NAME_APPLICATION_UNIQUE" UNIQUE ("name", "applicationId"), CONSTRAINT "PK_connectionProvider" PRIMARY KEY ("id"))`,
  ...syncableForeignKeys('connectionProvider'),
  `CREATE INDEX "IDX_CONNECTION_PROVIDER_APPLICATION_ID" ON "core"."connectionProvider" ("applicationId")`,
  `CREATE TYPE "core"."applicationVariable_scope_enum" AS ENUM('WORKSPACE', 'USER')`,
  `CREATE TABLE "core"."applicationVariable" (${SYNCABLE_COLUMNS}, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" text NOT NULL, "value" text, "description" text NOT NULL DEFAULT '', "label" text NOT NULL DEFAULT '', "isSecret" boolean NOT NULL DEFAULT false, "isDeprecated" boolean NOT NULL DEFAULT false, "isRequired" boolean NOT NULL DEFAULT false, "type" text NOT NULL DEFAULT 'TEXT', "options" jsonb, "scope" "core"."applicationVariable_scope_enum" NOT NULL DEFAULT 'WORKSPACE', "defaultValue" text, ${TIMESTAMP_COLUMNS}, CONSTRAINT "IDX_APPLICATION_VARIABLE_ID_SCOPE_UNIQUE" UNIQUE ("id", "scope"), CONSTRAINT "CHK_applicationVariable_value_encrypted" CHECK ("value" LIKE 'enc:v2:%'), CONSTRAINT "CHK_applicationVariable_deprecated_not_required" CHECK (NOT ("isRequired" AND "isDeprecated")), CONSTRAINT "CHK_applicationVariable_value_null_only_for_user_scope" CHECK (("scope" = 'USER') = ("value" IS NULL)), CONSTRAINT "CHK_applicationVariable_default_value_not_secret" CHECK (NOT ("isSecret" AND "defaultValue" IS NOT NULL)), CONSTRAINT "PK_applicationVariable" PRIMARY KEY ("id"))`,
  ...syncableForeignKeys('applicationVariable'),
  `CREATE INDEX "IDX_78ae6cfe5f49a76c4bf842ad58" ON "core"."applicationVariable" ("workspaceId")`,
  `CREATE TABLE "core"."userApplicationVariableValue" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicationVariableId" uuid NOT NULL, "scope" "core"."applicationVariable_scope_enum" NOT NULL DEFAULT 'USER', "userWorkspaceId" uuid NOT NULL, "value" text NOT NULL, ${TIMESTAMP_COLUMNS}, CONSTRAINT "IDX_USER_APPLICATION_VARIABLE_VALUE_VARIABLE_USER_UNIQUE" UNIQUE ("applicationVariableId", "userWorkspaceId"), CONSTRAINT "CHK_userApplicationVariableValue_scope_user" CHECK ("scope" = 'USER'), CONSTRAINT "CHK_userApplicationVariableValue_value_encrypted" CHECK ("value" LIKE 'enc:v2:%'), CONSTRAINT "PK_userApplicationVariableValue" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_USER_APPLICATION_VARIABLE_VALUE_WORKSPACE_ID" ON "core"."userApplicationVariableValue" ("workspaceId")`,
  `CREATE INDEX "IDX_USER_APPLICATION_VARIABLE_VALUE_USER_WORKSPACE_ID" ON "core"."userApplicationVariableValue" ("userWorkspaceId")`,
  `ALTER TABLE "core"."userApplicationVariableValue" ADD CONSTRAINT "FK_userApplicationVariableValue_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."userApplicationVariableValue" ADD CONSTRAINT "FK_userApplicationVariableValue_applicationVariable" FOREIGN KEY ("applicationVariableId", "scope") REFERENCES "core"."applicationVariable"("id","scope") ON DELETE CASCADE`,
  `ALTER TABLE "core"."userApplicationVariableValue" ADD CONSTRAINT "FK_userApplicationVariableValue_userWorkspaceId" FOREIGN KEY ("userWorkspaceId") REFERENCES "core"."userWorkspace"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."applicationRegistration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "universalIdentifier" uuid NOT NULL, "name" text NOT NULL, "oAuthClientId" text NOT NULL, "oAuthClientSecretHash" text, "oAuthRedirectUris" text array NOT NULL DEFAULT '{}', "oAuthScopes" text array NOT NULL DEFAULT '{}', "createdByUserId" uuid, "workspaceId" uuid, "sourceType" text NOT NULL DEFAULT 'local', "sourcePackage" text, "tarballFileId" uuid, "latestAvailableVersion" text, "isListed" boolean NOT NULL DEFAULT false, "isVetted" boolean NOT NULL DEFAULT false, "isPreInstalled" boolean NOT NULL DEFAULT false, "manifest" jsonb, "logo" text, "logoFileId" uuid, "description" text, "author" text, "category" text, "websiteUrl" text, "aboutDescription" text, "pricingDescription" text, "termsUrl" text, "emailSupport" text, "issueReportUrl" text, "screenshots" text array NOT NULL DEFAULT '{}', "galleryImages" jsonb, ${TIMESTAMP_COLUMNS}, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_NPM_HAS_SOURCE_PACKAGE" CHECK ("sourceType" <> 'npm' OR "sourcePackage" IS NOT NULL), CONSTRAINT "PK_applicationRegistration" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX "IDX_APPLICATION_REGISTRATION_UNIVERSAL_IDENTIFIER_UNIQUE" ON "core"."applicationRegistration" ("universalIdentifier") WHERE "deletedAt" IS NULL`,
  `CREATE UNIQUE INDEX "IDX_APPLICATION_REGISTRATION_OAUTH_CLIENT_ID_UNIQUE" ON "core"."applicationRegistration" ("oAuthClientId") WHERE "deletedAt" IS NULL`,
  `CREATE INDEX "IDX_APPLICATION_REGISTRATION_CREATED_BY_USER_ID" ON "core"."applicationRegistration" ("createdByUserId")`,
  `CREATE INDEX "IDX_APPLICATION_REGISTRATION_WORKSPACE_ID" ON "core"."applicationRegistration" ("workspaceId")`,
  `ALTER TABLE "core"."applicationRegistration" ADD CONSTRAINT "FK_applicationRegistration_createdByUserId" FOREIGN KEY ("createdByUserId") REFERENCES "core"."user"("id") ON DELETE SET NULL`,
  `ALTER TABLE "core"."applicationRegistration" ADD CONSTRAINT "FK_applicationRegistration_workspaceId" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE SET NULL`,
  `ALTER TABLE "core"."applicationRegistration" ADD CONSTRAINT "FK_applicationRegistration_tarballFileId" FOREIGN KEY ("tarballFileId") REFERENCES "core"."file"("id") ON DELETE SET NULL`,
  `ALTER TABLE "core"."applicationRegistration" ADD CONSTRAINT "FK_applicationRegistration_logoFileId" FOREIGN KEY ("logoFileId") REFERENCES "core"."file"("id") ON DELETE SET NULL`,
  `CREATE TABLE "core"."applicationRegistrationVariable" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" text NOT NULL, "encryptedValue" text NOT NULL, "description" text NOT NULL DEFAULT '', "isSecret" boolean NOT NULL DEFAULT true, "isRequired" boolean NOT NULL DEFAULT false, "isDeprecated" boolean NOT NULL DEFAULT false, "type" text NOT NULL DEFAULT 'TEXT', "options" jsonb, "applicationRegistrationId" uuid NOT NULL, ${TIMESTAMP_COLUMNS}, CONSTRAINT "IDX_APP_REG_VAR_KEY_APP_REGISTRATION_ID_UNIQUE" UNIQUE ("key", "applicationRegistrationId"), CONSTRAINT "CHK_applicationRegistrationVariable_encryptedValue_encrypted" CHECK ("encryptedValue" LIKE 'enc:v2:%'), CONSTRAINT "CHK_applicationRegistrationVariable_deprecated_not_required" CHECK (NOT ("isRequired" AND "isDeprecated")), CONSTRAINT "PK_applicationRegistrationVariable" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_APP_REG_VAR_APP_REGISTRATION_ID" ON "core"."applicationRegistrationVariable" ("applicationRegistrationId")`,
  `ALTER TABLE "core"."applicationRegistrationVariable" ADD CONSTRAINT "FK_applicationRegistrationVariable_applicationRegistrationId" FOREIGN KEY ("applicationRegistrationId") REFERENCES "core"."applicationRegistration"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."applicationAuthorization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "workspaceId" uuid NOT NULL, "applicationId" uuid NOT NULL, "userWorkspaceId" uuid NOT NULL, "scopes" text array, "lastAuthorizedAt" TIMESTAMP WITH TIME ZONE, "lastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, ${TIMESTAMP_COLUMNS}, CONSTRAINT "PK_applicationAuthorization" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX "IDX_APPLICATION_AUTHORIZATION_USER_APPLICATION_UNIQUE" ON "core"."applicationAuthorization" ("userId", "applicationId")`,
  `CREATE INDEX "IDX_APPLICATION_AUTHORIZATION_WORKSPACE_ID" ON "core"."applicationAuthorization" ("workspaceId")`,
  `CREATE INDEX "IDX_APPLICATION_AUTHORIZATION_APPLICATION_ID" ON "core"."applicationAuthorization" ("applicationId")`,
  `CREATE INDEX "IDX_APPLICATION_AUTHORIZATION_USER_WORKSPACE_ID" ON "core"."applicationAuthorization" ("userWorkspaceId")`,
  `ALTER TABLE "core"."applicationAuthorization" ADD CONSTRAINT "FK_APPLICATION_AUTHORIZATION_USER_ID" FOREIGN KEY ("userId") REFERENCES "core"."user"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."applicationAuthorization" ADD CONSTRAINT "FK_APPLICATION_AUTHORIZATION_WORKSPACE_ID" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."applicationAuthorization" ADD CONSTRAINT "FK_APPLICATION_AUTHORIZATION_APPLICATION_ID" FOREIGN KEY ("applicationId") REFERENCES "core"."application"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."applicationAuthorization" ADD CONSTRAINT "FK_APPLICATION_AUTHORIZATION_USER_WORKSPACE_ID" FOREIGN KEY ("userWorkspaceId") REFERENCES "core"."userWorkspace"("id") ON DELETE CASCADE`,
  `CREATE TABLE "core"."applicationTranslation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicationRegistrationId" uuid, "locale" text NOT NULL, "messages" jsonb NOT NULL DEFAULT '{}', ${TIMESTAMP_COLUMNS}, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_applicationTranslation" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX "IDX_APPLICATION_TRANSLATION_REGISTRATION_LOCALE_UNIQUE" ON "core"."applicationTranslation" ("applicationRegistrationId", "locale") WHERE "deletedAt" IS NULL`,
  `CREATE UNIQUE INDEX "IDX_APPLICATION_TRANSLATION_STANDARD_LOCALE_UNIQUE" ON "core"."applicationTranslation" ("locale") WHERE "deletedAt" IS NULL AND "applicationRegistrationId" IS NULL`,
  `ALTER TABLE "core"."applicationTranslation" ADD CONSTRAINT "FK_applicationTranslation_applicationRegistrationId" FOREIGN KEY ("applicationRegistrationId") REFERENCES "core"."applicationRegistration"("id") ON DELETE CASCADE`,
];

const RESTORE_DROPPED_COLUMNS = [
  `ALTER TABLE "core"."application" ADD "state" text NOT NULL DEFAULT 'INSTALLED', ADD "sourcePath" text NOT NULL DEFAULT '', ADD "packageJsonChecksum" text, ADD "packageJsonFileId" uuid, ADD "yarnLockChecksum" text, ADD "yarnLockFileId" uuid, ADD "availablePackages" jsonb NOT NULL DEFAULT '{}', ADD "billing" jsonb NOT NULL DEFAULT '{}', ADD "grantedCapabilities" character varying array NOT NULL DEFAULT '{}', ADD "logicFunctionLayerId" uuid, ADD "settingsCustomTabFrontComponentId" uuid, ADD "uninstallLogicFunctionId" uuid, ADD "uninstallHookCompletedForRequestedAt" TIMESTAMP WITH TIME ZONE, ADD "healthCheckLogicFunctionId" uuid, ADD "canBeUninstalled" boolean NOT NULL DEFAULT true, ADD "autoUpgrade" boolean NOT NULL DEFAULT false, ADD "isSdkLayerStale" boolean NOT NULL DEFAULT false, ADD "sdkClientCoreChecksum" text, ADD "frontComponentSharedDependenciesChecksum" text, ADD "frontComponentSharedDependenciesBuiltPath" text`,
  `ALTER TABLE "core"."application" ADD CONSTRAINT "FK_application_packageJsonFileId" FOREIGN KEY ("packageJsonFileId") REFERENCES "core"."file"("id") ON DELETE RESTRICT`,
  `ALTER TABLE "core"."application" ADD CONSTRAINT "FK_application_yarnLockFileId" FOREIGN KEY ("yarnLockFileId") REFERENCES "core"."file"("id") ON DELETE RESTRICT`,
  `ALTER TABLE "core"."commandMenuItem" ADD "frontComponentId" uuid`,
  `ALTER TABLE "core"."commandMenuItem" ADD CONSTRAINT "FK_commandMenuItem_frontComponentId" FOREIGN KEY ("frontComponentId") REFERENCES "core"."frontComponent"("id") ON DELETE CASCADE`,
  `CREATE INDEX "IDX_COMMAND_MENU_ITEM_FRONT_COMPONENT_ID_WORKSPACE_ID" ON "core"."commandMenuItem" ("frontComponentId", "workspaceId")`,
  `ALTER TABLE "core"."connectedAccount" ADD "connectionProviderId" uuid`,
  `ALTER TABLE "core"."connectedAccount" ADD CONSTRAINT "FK_connectedAccount_connectionProviderId" FOREIGN KEY ("connectionProviderId") REFERENCES "core"."connectionProvider"("id") ON DELETE CASCADE`,
  `CREATE INDEX "IDX_CONNECTED_ACCOUNT_CONNECTION_PROVIDER_ID" ON "core"."connectedAccount" ("connectionProviderId")`,
  `ALTER TABLE "core"."file" ADD "applicationRegistrationId" uuid`,
  `ALTER TABLE "core"."file" ADD CONSTRAINT "FK_feffd2addf9467be6d7cd51db76" FOREIGN KEY ("applicationRegistrationId") REFERENCES "core"."applicationRegistration"("id") ON DELETE CASCADE`,
  `ALTER TABLE "core"."file" ADD CONSTRAINT "IDX_FILE_APPLICATION_REGISTRATION_ID_PATH_UNIQUE" UNIQUE ("applicationRegistrationId", "path")`,
  `CREATE INDEX "IDX_FILE_APPLICATION_REGISTRATION_ID" ON "core"."file" ("applicationRegistrationId")`,
];

const COMMAND_MENU_ITEM_CHECK_WITH_FRONT_COMPONENT = `("engineComponentKey" = 'TRIGGER_WORKFLOW_VERSION' AND ("workflowVersionId" IS NOT NULL OR "coreWorkflowVersionId" IS NOT NULL) AND "frontComponentId" IS NULL AND "payload" IS NULL AND "navigationTargetObjectMetadataId" IS NULL) OR ("engineComponentKey" = 'FRONT_COMPONENT_RENDERER' AND "frontComponentId" IS NOT NULL AND "workflowVersionId" IS NULL AND "coreWorkflowVersionId" IS NULL AND "payload" IS NULL AND "navigationTargetObjectMetadataId" IS NULL) OR ("engineComponentKey" = 'NAVIGATION' AND (("payload" IS NOT NULL AND "navigationTargetObjectMetadataId" IS NULL) OR ("payload" IS NULL AND "navigationTargetObjectMetadataId" IS NOT NULL)) AND "workflowVersionId" IS NULL AND "coreWorkflowVersionId" IS NULL AND "frontComponentId" IS NULL) OR ("engineComponentKey" NOT IN ('TRIGGER_WORKFLOW_VERSION', 'FRONT_COMPONENT_RENDERER', 'NAVIGATION') AND "workflowVersionId" IS NULL AND "coreWorkflowVersionId" IS NULL AND "frontComponentId" IS NULL AND "payload" IS NULL AND "navigationTargetObjectMetadataId" IS NULL)`;

const COMMAND_MENU_ITEM_CHECK_WITHOUT_FRONT_COMPONENT = `("engineComponentKey" = 'TRIGGER_WORKFLOW_VERSION' AND ("workflowVersionId" IS NOT NULL OR "coreWorkflowVersionId" IS NOT NULL) AND "payload" IS NULL AND "navigationTargetObjectMetadataId" IS NULL) OR ("engineComponentKey" = 'NAVIGATION' AND (("payload" IS NOT NULL AND "navigationTargetObjectMetadataId" IS NULL) OR ("payload" IS NULL AND "navigationTargetObjectMetadataId" IS NOT NULL)) AND "workflowVersionId" IS NULL AND "coreWorkflowVersionId" IS NULL) OR ("engineComponentKey" NOT IN ('TRIGGER_WORKFLOW_VERSION', 'NAVIGATION') AND "workflowVersionId" IS NULL AND "coreWorkflowVersionId" IS NULL AND "payload" IS NULL AND "navigationTargetObjectMetadataId" IS NULL)`;

@RegisteredInstanceCommand('2.48.0', 1793824525473)
export class DropAppPlatformFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."commandMenuItem" DROP CONSTRAINT IF EXISTS "CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."commandMenuItem" DROP COLUMN IF EXISTS "frontComponentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."commandMenuItem" ADD CONSTRAINT "CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE" CHECK (${COMMAND_MENU_ITEM_CHECK_WITHOUT_FRONT_COMPONENT})`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."connectedAccount" DROP COLUMN IF EXISTS "connectionProviderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."file" DROP COLUMN IF EXISTS "applicationRegistrationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."application" ${DROPPED_APPLICATION_COLUMNS.map((column) => `DROP COLUMN IF EXISTS "${column}"`).join(', ')}`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."applicationTranslation", "core"."applicationAuthorization", "core"."applicationRegistrationVariable", "core"."applicationRegistration", "core"."userApplicationVariableValue", "core"."applicationVariable", "core"."connectionProvider", "core"."settingsMenuItem", "core"."logicFunction", "core"."logicFunctionLayer", "core"."frontComponent"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."logicFunction_executionmode_enum", "core"."settingsMenuItem_scope_enum", "core"."applicationVariable_scope_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of RECREATE_DROPPED_TABLES) {
      await queryRunner.query(statement);
    }

    for (const statement of RESTORE_DROPPED_COLUMNS) {
      await queryRunner.query(statement);
    }

    await queryRunner.query(
      `ALTER TABLE "core"."commandMenuItem" DROP CONSTRAINT "CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."commandMenuItem" ADD CONSTRAINT "CHK_CMD_MENU_ITEM_ENGINE_KEY_COHERENCE" CHECK (${COMMAND_MENU_ITEM_CHECK_WITH_FRONT_COMPONENT})`,
    );
  }
}
