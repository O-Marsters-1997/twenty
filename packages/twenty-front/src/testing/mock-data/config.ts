import { type ClientConfig } from '@/client-config/types/ClientConfig';
import { CaptchaDriverType, SupportDriver } from '~/generated-metadata/graphql';

export const mockedClientConfig: ClientConfig = {
  aiModels: [],
  aiEvaluationModels: [],
  aiModelTiers: [],
  signInPrefilled: true,
  isMultiWorkspaceEnabled: false,
  isEmailVerificationRequired: false,
  authProviders: {
    google: true,
    magicLink: false,
    password: true,
  },
  frontDomain: 'localhost',
  serverUrl: 'http://localhost:3000',
  defaultSubdomain: 'app',
  support: {
    supportDriver: SupportDriver.FRONT,
    supportFrontChatId: null,
  },
  captcha: {
    provider: CaptchaDriverType.GOOGLE_RECAPTCHA,
    siteKey: 'MOCKED_SITE_KEY',
  },
  api: { mutationMaximumAffectedRecords: 100 },
  canManageFeatureFlags: true,
  publicFeatureFlags: [],
  isGoogleMessagingEnabled: true,
  isGoogleCalendarEnabled: true,
  isAttachmentPreviewEnabled: true,
  isConfigVariablesInDbEnabled: false,
  isTwoFactorAuthenticationEnabled: false,
  isEmailingDomainInDemoMode: false,
  allowRequestsToTwentyIcons: true,
  isClickHouseConfigured: false,
  isWorkspaceSchemaDDLLocked: false,
  isOnboardingAiChatEnabled: false,
  isCompanyEnrichmentEnabled: false,
};
