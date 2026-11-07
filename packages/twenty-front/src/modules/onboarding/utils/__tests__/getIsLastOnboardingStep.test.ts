import { getIsLastOnboardingStep } from '@/onboarding/utils/getIsLastOnboardingStep';
import { OnboardingStatus } from '~/generated-metadata/graphql';
import {
  mockCurrentWorkspace,
  mockedUserData,
} from '~/testing/mock-data/users';

const buildArgs = ({
  onboardingStatus,
  workspaceMembersCount = 1,
}: {
  onboardingStatus: OnboardingStatus;
  workspaceMembersCount?: number;
}) => ({
  currentUser: { ...mockedUserData, onboardingStatus },
  currentWorkspace: { ...mockCurrentWorkspace, workspaceMembersCount },
});

describe('getIsLastOnboardingStep', () => {
  it('should treat the invite step as the last one', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({ onboardingStatus: OnboardingStatus.INVITE_TEAM }),
      ),
    ).toBe(true);
  });

  it('should treat profile creation as the last step for someone joining a team', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({
          onboardingStatus: OnboardingStatus.PROFILE_CREATION,
          workspaceMembersCount: 3,
        }),
      ),
    ).toBe(true);
  });

  it('should not treat an intermediate step as the last one', () => {
    expect(
      getIsLastOnboardingStep(
        buildArgs({ onboardingStatus: OnboardingStatus.SYNC_EMAIL }),
      ),
    ).toBe(false);
  });
});
