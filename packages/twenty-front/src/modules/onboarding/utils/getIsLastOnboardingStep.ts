import {
  type GetNextOnboardingStatusArgs,
  getNextOnboardingStatus,
} from '@/onboarding/utils/getNextOnboardingStatus';
import { OnboardingStatus } from '~/generated-metadata/graphql';

export const getIsLastOnboardingStep = (args: GetNextOnboardingStatusArgs) =>
  getNextOnboardingStatus(args) === OnboardingStatus.COMPLETED;
