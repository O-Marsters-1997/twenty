import {
  type ApiConfig,
  type AuthProviders,
  type Captcha,
  type ClientAiEvaluationModelConfig,
  type ClientAiModelConfig,
  type ClientAiModelTierConfig,
  type PublicFeatureFlag,
  type Support,
} from '~/generated-metadata/graphql';

export type ClientConfig = {
  appVersion?: string;
  aiModels: Array<ClientAiModelConfig>;
  aiEvaluationModels: Array<ClientAiEvaluationModelConfig>;
  aiModelTiers: Array<ClientAiModelTierConfig>;
  api: ApiConfig;
  authProviders: AuthProviders;
  isCompanyEnrichmentEnabled: boolean;
  canManageFeatureFlags: boolean;
  captcha: Captcha;
  defaultSubdomain?: string;
  frontDomain: string;
  serverUrl: string;
  isAttachmentPreviewEnabled: boolean;
  isConfigVariablesInDbEnabled: boolean;
  isEmailVerificationRequired: boolean;
  isGoogleCalendarEnabled: boolean;
  isGoogleMessagingEnabled: boolean;
  isMultiWorkspaceEnabled: boolean;
  isEmailingDomainInDemoMode: boolean;
  isClickHouseConfigured: boolean;
  isWorkspaceSchemaDDLLocked: boolean;
  isOnboardingAiChatEnabled: boolean;
  publicFeatureFlags: Array<PublicFeatureFlag>;
  signInPrefilled: boolean;
  support: Support;
  isTwoFactorAuthenticationEnabled: boolean;
  allowRequestsToTwentyIcons: boolean;
};
