import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useOnboardingStatus } from '@/onboarding/hooks/useOnboardingStatus';
import { useQuery } from '@apollo/client/react';
import { useLocation } from 'react-router-dom';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getAppPath, getSettingsPath } from 'twenty-shared/utils';
import { OnboardingStatus, PageLayoutType } from '~/generated-metadata/graphql';

import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { usePageChangeEffectNavigateLocation } from '@/app/hooks/usePageChangeEffectNavigateLocation';
import { UNTESTED_APP_PATHS } from '~/testing/constants/UntestedAppPaths';
import { isMatchingLocation } from '~/utils/isMatchingLocation';

jest.mock('@/onboarding/hooks/useOnboardingStatus');
const setupMockOnboardingStatus = (
  onboardingStatus: OnboardingStatus | undefined,
) => {
  jest.mocked(useOnboardingStatus).mockReturnValueOnce(onboardingStatus);
};

jest.mock('~/utils/isMatchingLocation');
const mockIsMatchingLocation = jest.mocked(isMatchingLocation);

const setupMockIsMatchingLocation = (pathname: string) => {
  mockIsMatchingLocation.mockImplementation(
    (_location, path) => path === pathname,
  );
};

jest.mock('@/auth/hooks/useIsLogged');
const setupMockIsLogged = (isLogged: boolean) => {
  jest.mocked(useIsLogged).mockReturnValueOnce(isLogged);
};

const defaultHomePagePath = '/objects/companies';

jest.mock('@/navigation/hooks/useDefaultHomePagePath');
jest.mocked(useDefaultHomePagePath).mockReturnValue({
  defaultHomePagePath,
});

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace');
const setupMockIsOnAWorkspace = (isOnAWorkspace: boolean) => {
  jest.mocked(useIsCurrentLocationOnAWorkspace).mockReturnValue({
    isOnAWorkspace,
  });
};

jest.mock('@apollo/client/react');
const setupMockUseQuery = (result?: { data?: unknown; loading?: boolean }) => {
  jest.mocked(useQuery).mockReturnValueOnce({
    data: result?.data ?? undefined,
    loading: result?.loading ?? false,
  } as ReturnType<typeof useQuery>);
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

const setupMockUseLocation = (
  loc: AppPath,
  objectNamePlural?: string,
  pageLayoutId?: string,
) => {
  const pathname =
    loc === AppPath.RecordIndexPage
      ? getAppPath(AppPath.RecordIndexPage, {
          objectNamePlural: objectNamePlural ?? 'default-object',
        })
      : loc === AppPath.PageLayoutPage && pageLayoutId
        ? getAppPath(AppPath.PageLayoutPage, { pageLayoutId })
        : loc === AppPath.PageLayoutPage
          ? '/page-layout'
          : loc;

  jest.mocked(useLocation).mockReturnValueOnce({
    pathname,
    search: '',
    hash: '',
    state: null,
    key: 'test-location',
  });
};

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
const setupMockState = (
  objectNamePlural?: string,
  returnToPath?: string,
  currentWorkspace: object | null = { id: 'mock-workspace-id' },
  isMinimalMetadataReady: boolean = true,
) => {
  jest
    .mocked(useAtomStateValue)
    .mockReturnValueOnce(currentWorkspace)
    .mockReturnValueOnce([{ namePlural: objectNamePlural ?? '' }])
    .mockReturnValueOnce(isMinimalMetadataReady)
    .mockReturnValueOnce(returnToPath ?? '');
};

// prettier-ignore
const testCases: {
  loc: AppPath;
  isLogged: boolean;
  onboardingStatus: OnboardingStatus | undefined;
  res: string | undefined;
  isOnAWorkspace?: boolean;
  objectNamePluralFromParams?: string;
  objectNamePluralFromMetadata?: string;
  returnToPath?: string;
  pageLayoutId?: string;
  useQueryResult?: { data?: unknown; loading?: boolean };
  isMinimalMetadataReady?: boolean;
}[] = [
  { loc: AppPath.Verify, isLogged: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.SignInUp, isLogged: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.Invite, isLogged: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.Invite, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: '/workspace-activation' },
  { loc: AppPath.Invite, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: '/create/profile' },
  { loc: AppPath.Invite, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: '/sync/emails' },
  { loc: AppPath.Invite, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: '/invite-team' },
  { loc: AppPath.Invite, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.ResetPassword, isLogged: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.ResetPassword, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: '/workspace-activation' },
  { loc: AppPath.ResetPassword, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: '/create/profile' },
  { loc: AppPath.ResetPassword, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: '/sync/emails' },
  { loc: AppPath.ResetPassword, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: '/invite-team' },
  { loc: AppPath.ResetPassword, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.VerifyEmail, isLogged: false, onboardingStatus: undefined, res: undefined },
  { loc: AppPath.VerifyEmail, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.VerifyEmail, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.VerifyEmail, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.VerifyEmail, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.VerifyEmail, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.WorkspaceActivation, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.WorkspaceActivation, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: undefined },
  { loc: AppPath.WorkspaceActivation, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.WorkspaceActivation, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.WorkspaceActivation, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.WorkspaceActivation, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.CreateProfile, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.CreateProfile, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.CreateProfile, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: undefined },
  { loc: AppPath.CreateProfile, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.CreateProfile, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.CreateProfile, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.SyncEmails, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.SyncEmails, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.SyncEmails, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.SyncEmails, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: undefined },
  { loc: AppPath.SyncEmails, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.SyncEmails, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.InviteTeam, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.InviteTeam, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.InviteTeam, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.InviteTeam, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.InviteTeam, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: undefined },
  { loc: AppPath.InviteTeam, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },




  { loc: AppPath.Index, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: defaultHomePagePath },

  { loc: AppPath.TasksPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.TasksPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.TasksPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.TasksPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.TasksPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.TasksPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.Dpa, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Dpa, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Dpa, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Dpa, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.Dpa, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Dpa, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: getSettingsPath(SettingsPath.LegalDpa) },

  { loc: AppPath.AiChat, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.AiChat, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.AiChat, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.AiChat, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.AiChat, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.AiChat, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.AiChatInbox, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.AiChatInbox, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.AiChatInbox, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.AiChatInbox, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.AiChatInbox, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.AiChatInbox, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.Home, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Home, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Home, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Home, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.Home, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Home, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.OpportunitiesPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.OpportunitiesPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.OpportunitiesPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.OpportunitiesPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.OpportunitiesPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.OpportunitiesPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.RecordIndexPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, objectNamePluralFromParams: 'existing-object', objectNamePluralFromMetadata: 'existing-object' },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, objectNamePluralFromParams: 'non-existing-object', objectNamePluralFromMetadata: 'existing-object' },
  { loc: AppPath.RecordIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, objectNamePluralFromParams: 'non-existing-object', objectNamePluralFromMetadata: 'existing-object', isMinimalMetadataReady: false },

  { loc: AppPath.RecordShowPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.RecordShowPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.RecordShowPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.RecordShowPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.RecordShowPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.RecordShowPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.WorkflowCoreShowPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.WorkflowCoreShowPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.WorkflowCoreShowPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.WorkflowCoreShowPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.WorkflowCoreShowPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.WorkflowCoreShowPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.AgentIndexPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.AgentIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.AgentIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.AgentIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.AgentIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.AgentIndexPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.AgentShowPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.AgentShowPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.AgentShowPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.AgentShowPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.AgentShowPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.AgentShowPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.PageLayoutPage, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, pageLayoutId: 'valid-id', useQueryResult: { loading: true } },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, pageLayoutId: 'non-existent-id', useQueryResult: { data: { getPageLayout: null }, loading: false } },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: AppPath.NotFound, pageLayoutId: 'wrong-type-id', useQueryResult: { data: { getPageLayout: { type: PageLayoutType.RECORD_PAGE } }, loading: false } },
  { loc: AppPath.PageLayoutPage, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined, pageLayoutId: 'valid-standalone-id', useQueryResult: { data: { getPageLayout: { type: PageLayoutType.STANDALONE_PAGE } }, loading: false } },

  { loc: AppPath.SettingsCatchAll, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.SettingsCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.SettingsCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.SettingsCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.SettingsCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.SettingsCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.DevelopersCatchAll, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.DevelopersCatchAll, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.Authorize, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.Authorize, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.Authorize, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.Authorize, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.Authorize, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.Authorize, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.NotFoundWildcard, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.NotFoundWildcard, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.NotFoundWildcard, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.NotFoundWildcard, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.NotFoundWildcard, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.NotFoundWildcard, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },

  { loc: AppPath.NotFound, isLogged: false, onboardingStatus: undefined, res: AppPath.SignInUp },
  { loc: AppPath.NotFound, isLogged: true, onboardingStatus: OnboardingStatus.WORKSPACE_ACTIVATION, res: AppPath.WorkspaceActivation },
  { loc: AppPath.NotFound, isLogged: true, onboardingStatus: OnboardingStatus.PROFILE_CREATION, res: AppPath.CreateProfile },
  { loc: AppPath.NotFound, isLogged: true, onboardingStatus: OnboardingStatus.SYNC_EMAIL, res: AppPath.SyncEmails },
  { loc: AppPath.NotFound, isLogged: true, onboardingStatus: OnboardingStatus.INVITE_TEAM, res: AppPath.InviteTeam },
  { loc: AppPath.NotFound, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, res: undefined },


  // returnToPath: should redirect to saved path instead of defaultHomePagePath
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, returnToPath: '/authorize?clientId=abc', res: '/authorize?clientId=abc' },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, returnToPath: '/objects/tasks', res: '/objects/tasks' },
  { loc: AppPath.Index, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, returnToPath: '/settings/api-keys', res: '/settings/api-keys' },



  // isOnAWorkspace:false — on default domain, don't redirect to returnToPath or defaultHomePagePath from auth pages
  { loc: AppPath.Verify, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, isOnAWorkspace: false, res: undefined },
  { loc: AppPath.SignInUp, isLogged: true, onboardingStatus: OnboardingStatus.COMPLETED, isOnAWorkspace: false, res: undefined },
];

describe('usePageChangeEffectNavigateLocation', () => {
  it.each(testCases)(
    'with location $loc and onboardingStatus $onboardingStatus should return $res`',
    ({
      loc,
      onboardingStatus,
      isLogged,
      isOnAWorkspace,
      objectNamePluralFromParams,
      objectNamePluralFromMetadata,
      returnToPath,
      pageLayoutId,
      useQueryResult,
      isMinimalMetadataReady,
      res,
    }) => {
      setupMockIsMatchingLocation(loc);
      setupMockOnboardingStatus(onboardingStatus);
      setupMockIsLogged(isLogged);
      setupMockIsOnAWorkspace(isOnAWorkspace ?? true);
      setupMockUseQuery(useQueryResult);
      setupMockUseLocation(loc, objectNamePluralFromParams, pageLayoutId);
      setupMockState(
        objectNamePluralFromMetadata ??
          (loc === AppPath.RecordIndexPage ? 'default-object' : undefined),
        returnToPath,
        undefined,
        isMinimalMetadataReady ?? true,
      );

      expect(usePageChangeEffectNavigateLocation()).toEqual(res);
    },
  );

  describe('tests should be exhaustive', () => {
    it('all location and onboarding status should be tested', () => {
      expect(testCases.length).toEqual(
        (Object.keys(AppPath).length - UNTESTED_APP_PATHS.length) *
          (Object.keys(OnboardingStatus).length + ['notLogged'].length) +
          ['nonExistingObjectInParam', 'existingObjectInParam:false'].length +
          ['nonExistingObjectInParam:metadataNotReady'].length +
          [
            'pageLayout:loading',
            'pageLayout:missing',
            'pageLayout:wrongType',
            'pageLayout:validStandalone',
          ].length +
          ['returnToPath:verify', 'returnToPath:signInUp', 'returnToPath:index']
            .length +
          ['notOnWorkspace:verify', 'notOnWorkspace:signInUp'].length,
      );
    });
  });
});

describe('usePageChangeEffectNavigateLocation — authenticated with no current workspace', () => {
  it.each([AppPath.Index, AppPath.TasksPage, AppPath.SettingsCatchAll])(
    'redirects to SignInUp from %s when authenticated with no current workspace',
    (loc) => {
      setupMockIsMatchingLocation(loc);
      setupMockOnboardingStatus(undefined);
      setupMockIsLogged(true);
      setupMockIsOnAWorkspace(true);
      setupMockUseQuery();
      setupMockUseLocation(loc);
      setupMockState(undefined, undefined, null);

      expect(usePageChangeEffectNavigateLocation()).toEqual(AppPath.SignInUp);
    },
  );
});
