import { renderHook } from '@testing-library/react';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { CUSTOM_WORKSPACE_APPLICATION_MOCK } from '@/object-metadata/hooks/__tests__/constants/CustomWorkspaceApplicationMock.test.constant';
import { useColumnDefinitionsFromObjectMetadata } from '@/object-metadata/hooks/useColumnDefinitionsFromObjectMetadata';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import {
  AiModelTier,
  WorkspaceActivationStatus,
  WorkspaceDiscoverability,
} from '~/generated-metadata/graphql';
import { getJestMetadataAndApolloMocksAndCommandMenuWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksAndCommandMenuWrapper';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

const Wrapper = getJestMetadataAndApolloMocksAndCommandMenuWrapper({
  apolloMocks: [],
  componentInstanceId: 'instanceId',
  contextStoreCurrentObjectMetadataNameSingular: 'company',
});

describe('useColumnDefinitionsFromObjectMetadata', () => {
  it('should return expected definitions', () => {
    jotaiStore.set(currentWorkspaceState.atom, {
      workspaceCustomApplication: {
        id: CUSTOM_WORKSPACE_APPLICATION_MOCK.id,
      },
      installedApplications: [],
      id: '1',
      featureFlags: [],
      allowImpersonation: false,
      subdomain: 'test',
      activationStatus: WorkspaceActivationStatus.ACTIVE,
      metadataVersion: 1,
      isPublicInviteLinkEnabled: false,
      isCampaignClickTrackingEnabled: false,
      isCampaignOpenTrackingEnabled: false,
      workspaceDiscoverability: WorkspaceDiscoverability.PUBLIC,
      isGoogleAuthEnabled: true,
      isPasswordAuthEnabled: true,
      isGoogleAuthBypassEnabled: false,
      isPasswordAuthBypassEnabled: false,
      workspaceUrls: {
        subdomainUrl: 'https://twenty.twenty.com',
      },
      isTwoFactorAuthenticationEnforced: false,
      trashRetentionDays: 14,
      eventLogRetentionDays: 365 * 3,
      aiChatModelTier: AiModelTier.fast,
      aiAgentModelTier: AiModelTier.fast,
      isAutoModelSelectionEnabled: true,
      aiModelIdByTier: {},
      isInternalMessagesImportEnabled: false,
    });

    const companyObjectMetadata = getTestEnrichedObjectMetadataItemsMock().find(
      (item) => item.nameSingular === 'company',
    );

    const { result } = renderHook(
      (objectMetadataItem: EnrichedObjectMetadataItem) => {
        return useColumnDefinitionsFromObjectMetadata(objectMetadataItem);
      },
      {
        initialProps: companyObjectMetadata,
        wrapper: Wrapper,
      },
    );

    const { columnDefinitions } = result.current;

    expect(columnDefinitions.length).toBe(24);
  });
});
