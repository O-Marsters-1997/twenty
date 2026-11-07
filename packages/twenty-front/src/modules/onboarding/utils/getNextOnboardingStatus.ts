import { type CurrentUser } from '@/auth/states/currentUserState';
import { type CurrentWorkspace } from '@/auth/states/currentWorkspaceState';
import { OnboardingStatus } from '~/generated-metadata/graphql';

export type GetNextOnboardingStatusArgs = {
  currentUser: CurrentUser | null;
  currentWorkspace: CurrentWorkspace | null;
};

export const getNextOnboardingStatus = ({
  currentUser,
  currentWorkspace,
}: GetNextOnboardingStatusArgs) => {
  if (currentUser?.onboardingStatus === OnboardingStatus.WORKSPACE_ACTIVATION) {
    return OnboardingStatus.SYNC_EMAIL;
  }

  if (currentUser?.onboardingStatus === OnboardingStatus.SYNC_EMAIL) {
    return OnboardingStatus.PROFILE_CREATION;
  }

  if (currentUser?.onboardingStatus === OnboardingStatus.PROFILE_CREATION) {
    if (currentWorkspace?.workspaceMembersCount === 1) {
      return OnboardingStatus.INVITE_TEAM;
    }
    return OnboardingStatus.COMPLETED;
  }

  return OnboardingStatus.COMPLETED;
};
