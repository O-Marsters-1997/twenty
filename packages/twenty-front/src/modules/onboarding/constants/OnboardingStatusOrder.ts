import { OnboardingStatus } from '~/generated-metadata/graphql';

export const ONBOARDING_STATUS_ORDER = [
  OnboardingStatus.WORKSPACE_ACTIVATION,
  OnboardingStatus.SYNC_EMAIL,
  OnboardingStatus.PROFILE_CREATION,
  OnboardingStatus.INVITE_TEAM,
  OnboardingStatus.COMPLETED,
];
