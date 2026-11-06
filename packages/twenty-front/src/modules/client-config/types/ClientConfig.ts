import {
  type ApiConfig,
  type AuthProviders,
  type Billing,
  type Captcha,
  type ClientAiEvaluationModelConfig,
  type ClientAiModelConfig,
  type ClientAiModelTierConfig,
  type PublicFeatureFlag,
  type Support,
} from '~/generated-metadata/graphql';
import { type OnboardingConfig } from '@/client-config/types/OnboardingConfig';

export type ClientConfig = {
  appVersion?: string;
  aiModels: Array<ClientAiModelConfig>;
  aiEvaluationModels: Array<ClientAiEvaluationModelConfig>;
  aiModelTiers: Array<ClientAiModelTierConfig>;
  api: ApiConfig;
  authProviders: AuthProviders;
  billing: Billing;
  calendarBookingPageId?: string;
  isBookCallOnboardingStepEnabled: boolean;
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
  isMicrosoftCalendarEnabled: boolean;
  isMicrosoftMessagingEnabled: boolean;
  isMultiWorkspaceEnabled: boolean;
  isEmailingDomainInDemoMode: boolean;
  isClickHouseConfigured: boolean;
  isWorkspaceSchemaDDLLocked: boolean;
  isOnboardingAiChatEnabled: boolean;
  onboarding: OnboardingConfig | null;
  publicFeatureFlags: Array<PublicFeatureFlag>;
  signInPrefilled: boolean;
  support: Support;
  isTwoFactorAuthenticationEnabled: boolean;
  allowRequestsToTwentyIcons: boolean;
};
