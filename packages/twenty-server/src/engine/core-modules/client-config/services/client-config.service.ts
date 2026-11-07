import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { readIsCompanyEnrichmentEnabled } from 'src/engine/core-modules/company-enrichment/utils/read-is-company-enrichment-enabled.util';
import { NodeEnvironment } from 'src/engine/core-modules/twenty-config/interfaces/node-environment.interface';
import { SupportDriver } from 'src/engine/core-modules/twenty-config/interfaces/support.interface';

import {
  type ClientAiEvaluationModelConfig,
  type ClientAiModelConfig,
  type ClientConfig,
} from 'src/engine/core-modules/client-config/client-config.entity';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { PUBLIC_FEATURE_FLAGS } from 'src/engine/core-modules/feature-flag/constants/public-feature-flag.const';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { AI_MODEL_TIERS, parseAiModelVariantId } from 'twenty-shared/ai';
import { MODEL_FAMILY_LABELS } from 'src/engine/metadata-modules/ai/ai-models/constants/model-family-labels.const';
import { getAvailableEfforts } from 'src/engine/metadata-modules/ai/ai-models/utils/get-available-efforts.util';
import { getNativeModelCapabilities } from 'src/engine/metadata-modules/ai/ai-models/utils/get-native-model-capabilities.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { type AiModelBenchmark } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-benchmark.type';
import { type AiModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-config.type';

@Injectable()
export class ClientConfigService {
  constructor(
    private twentyConfigService: TwentyConfigService,
    private domainServerConfigService: DomainServerConfigService,
    private aiModelRegistryService: AiModelRegistryService,
  ) {}

  private resolveBenchmark(modelConfig: AiModelConfig | undefined): {
    benchmark?: AiModelBenchmark;
    isInherited: boolean;
  } {
    if (isDefined(modelConfig?.benchmark)) {
      return { benchmark: modelConfig.benchmark, isInherited: false };
    }

    const { modelId: baseModelId, effort } = parseAiModelVariantId(
      modelConfig?.modelId ?? '',
    );
    const baseBenchmark = isDefined(effort)
      ? this.aiModelRegistryService.getModelConfig(baseModelId)?.benchmark
      : undefined;

    return { benchmark: baseBenchmark, isInherited: isDefined(baseBenchmark) };
  }

  async getClientConfig(): Promise<ClientConfig> {
    const captchaProvider = this.twentyConfigService.get('CAPTCHA_DRIVER');
    const supportDriver = this.twentyConfigService.get('SUPPORT_DRIVER');
    const calendarBookingPageId = this.twentyConfigService.get(
      'CALENDAR_BOOKING_PAGE_ID',
    );
    const isCompanyEnrichmentEnabled = readIsCompanyEnrichmentEnabled(
      this.twentyConfigService,
    );

    const isEmailingDomainInDemoMode =
      this.twentyConfigService.get('EMAILING_DOMAIN_DRIVER') ===
      EmailingDomainDriver.LOG;

    const availableModels =
      this.aiModelRegistryService.getAdminFilteredModels();
    const resolvedProviders =
      this.aiModelRegistryService.getResolvedProvidersForAdmin();

    const getProviderLabel = (providerName?: string | null) =>
      providerName
        ? (resolvedProviders[providerName]?.label ?? providerName)
        : undefined;

    const aiModels: ClientAiModelConfig[] = availableModels.map(
      (registeredModel) => {
        const modelConfig = this.aiModelRegistryService.getModelConfig(
          registeredModel.modelId,
        );

        const modelFamily = modelConfig?.modelFamily;
        const providerName = registeredModel.providerName;
        const { benchmark, isInherited } = this.resolveBenchmark(modelConfig);

        return {
          modelId: registeredModel.modelId,
          label: modelConfig?.label || registeredModel.modelId,
          modelFamily,
          modelFamilyLabel: modelFamily
            ? MODEL_FAMILY_LABELS[modelFamily]
            : undefined,
          sdkPackage: registeredModel.sdkPackage,
          providerName,
          providerLabel: getProviderLabel(providerName),
          nativeCapabilities: getNativeModelCapabilities(
            registeredModel.sdkPackage,
          ),
          contextWindowTokens: modelConfig?.contextWindowTokens,
          maxOutputTokens: modelConfig?.maxOutputTokens,
          isDeprecated: modelConfig?.isDeprecated,
          dataResidency: modelConfig?.dataResidency,
          intelligenceIndex: benchmark?.intelligenceIndex,
          outputTokensPerSecond: benchmark?.outputTokensPerSecond,
          costPerTask: benchmark?.costPerTask,
          isBenchmarkInherited: isInherited,
          efforts:
            isDefined(modelConfig) && !isDefined(modelConfig.effort)
              ? getAvailableEfforts(modelConfig)
              : undefined,
          effort: modelConfig?.effort,
        };
      },
    );

    const aiEvaluationModels: ClientAiEvaluationModelConfig[] =
      this.aiModelRegistryService
        .getAvailableEvaluationModelConfigs()
        .filter((modelConfig) =>
          this.aiModelRegistryService.isModelAdminAllowed(modelConfig.modelId),
        )
        .map((modelConfig) => ({
          modelId: modelConfig.modelId,
          label: modelConfig.label,
          description: modelConfig.description,
          providerLabel: getProviderLabel(modelConfig.modelId.split('/')[0]),
          isAvailable: isDefined(
            this.aiModelRegistryService.getEvaluationModel(modelConfig.modelId),
          ),
          supportedQuestionTypes: modelConfig.supportedQuestionTypes,
          maxCriteriaPerQuestion: modelConfig.maxCriteriaPerQuestion,
          maxScoreLevels: modelConfig.maxScoreLevels,
          medianLatencyMs: modelConfig.medianLatencyMs,
          isDeprecated: modelConfig.isDeprecated,
        }));

    const aiModelTiers = AI_MODEL_TIERS.flatMap((tier) => {
      const model = this.aiModelRegistryService.findDefaultModelForTier(tier);

      return isDefined(model) ? [{ tier, modelId: model.modelId }] : [];
    });

    const clientConfig: ClientConfig = {
      appVersion: this.twentyConfigService.get('APP_VERSION'),
      aiModels,
      aiEvaluationModels,
      aiModelTiers,
      authProviders: {
        google: this.twentyConfigService.get('AUTH_GOOGLE_ENABLED'),
        magicLink: false,
        password: this.twentyConfigService.get('AUTH_PASSWORD_ENABLED'),
      },
      signInPrefilled: this.twentyConfigService.get('SIGN_IN_PREFILLED'),
      isMultiWorkspaceEnabled: this.twentyConfigService.get(
        'IS_MULTIWORKSPACE_ENABLED',
      ),
      isEmailVerificationRequired: this.twentyConfigService.get(
        'IS_EMAIL_VERIFICATION_REQUIRED',
      ),
      defaultSubdomain: this.twentyConfigService.get('DEFAULT_SUBDOMAIN'),
      frontDomain: this.domainServerConfigService.getFrontUrl().hostname,
      serverUrl: this.twentyConfigService.get('SERVER_URL'),
      support: {
        supportDriver: supportDriver ? supportDriver : SupportDriver.NONE,
        supportFrontChatId: this.twentyConfigService.get(
          'SUPPORT_FRONT_CHAT_ID',
        ),
      },
      captcha: {
        provider: captchaProvider ? captchaProvider : undefined,
        siteKey: this.twentyConfigService.get('CAPTCHA_SITE_KEY'),
      },
      api: {
        mutationMaximumAffectedRecords: this.twentyConfigService.get(
          'MUTATION_MAXIMUM_AFFECTED_RECORDS',
        ),
      },
      onboarding: {
        inviteTeamMaxInvites: this.twentyConfigService.get(
          'ONBOARDING_INVITE_TEAM_MAX_INVITES',
        ),
      },
      isAttachmentPreviewEnabled: this.twentyConfigService.get(
        'IS_ATTACHMENT_PREVIEW_ENABLED',
      ),
      canManageFeatureFlags:
        this.twentyConfigService.get('NODE_ENV') ===
          NodeEnvironment.DEVELOPMENT ||
        this.twentyConfigService.get('IS_FEATURE_FLAG_MANAGEMENT_ENABLED'),
      publicFeatureFlags: PUBLIC_FEATURE_FLAGS,
      isCookieSessionEnabled: true,
      isGoogleMessagingEnabled: this.twentyConfigService.get(
        'MESSAGING_PROVIDER_GMAIL_ENABLED',
      ),
      isGoogleCalendarEnabled: this.twentyConfigService.get(
        'CALENDAR_PROVIDER_GOOGLE_ENABLED',
      ),
      isConfigVariablesInDbEnabled: this.twentyConfigService.get(
        'IS_CONFIG_VARIABLES_IN_DB_ENABLED',
      ),
      isEmailingDomainInDemoMode,
      allowRequestsToTwentyIcons: this.twentyConfigService.get(
        'ALLOW_REQUESTS_TO_TWENTY_ICONS',
      ),
      calendarBookingPageId: isNonEmptyString(calendarBookingPageId)
        ? calendarBookingPageId
        : undefined,
      isCompanyEnrichmentEnabled,
      isClickHouseConfigured: !!this.twentyConfigService.get('CLICKHOUSE_URL'),
      isWorkspaceSchemaDDLLocked: this.twentyConfigService.get(
        'WORKSPACE_SCHEMA_DDL_LOCKED',
      ),
      isOnboardingAiChatEnabled: this.twentyConfigService.get(
        'IS_ONBOARDING_AI_CHAT_ENABLED',
      ),
    };

    return clientConfig;
  }
}
