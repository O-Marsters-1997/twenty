import { isCurrentUserLoadedState } from '@/auth/states/isCurrentUserLoadedState';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { isGoogleCalendarEnabledState } from '@/client-config/states/isGoogleCalendarEnabledState';
import { isGoogleMessagingEnabledState } from '@/client-config/states/isGoogleMessagingEnabledState';
import { OnboardingSkipDialog } from '@/onboarding/components/OnboardingSkipDialog';
import { OnboardingSkipDialogAvatars } from '@/onboarding/components/OnboardingSkipDialogAvatars';
import { ONBOARDING_NETWORK_PREVIEW_PEOPLE } from '@/onboarding/constants/OnboardingNetworkPreviewPeople';
import { ONBOARDING_SKIP_DIALOG_IDS } from '@/onboarding/constants/OnboardingSkipDialogIds';
import { SyncEmailsAutoSkipEffect } from '@/onboarding/effect-components/SyncEmailsAutoSkipEffect';
import { useOnboardingStepEnterHotkey } from '@/onboarding/hooks/useOnboardingStepEnterHotkey';
import { useSkipSyncEmailOnboardingStep } from '@/onboarding/hooks/useSkipSyncEmailOnboardingStep';
import { useTriggerApisOAuth } from '@/settings/accounts/hooks/useTriggerApiOAuth';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PageFocusId } from '@/types/PageFocusId';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { AppPath, ConnectedAccountProvider } from 'twenty-shared/types';
import {
  CalendarChannelVisibility,
  MessageChannelVisibility,
  PermissionFlagType,
} from '~/generated-metadata/graphql';
import { IconGoogle } from 'twenty-ui/icon';
import { ImportContacts } from '~/pages/onboarding/ImportContacts';

export const SyncEmails = () => {
  const { t } = useLingui();
  const { openDialog } = useDialog();
  const { triggerApisOAuth } = useTriggerApisOAuth();
  const skipSyncEmailOnboardingStep = useSkipSyncEmailOnboardingStep();
  const [hasAutoSkipFailed, setHasAutoSkipFailed] = useState(false);
  const isCurrentUserLoaded = useAtomStateValue(isCurrentUserLoadedState);
  const hasConnectedAccountsPermission = useHasPermissionFlag(
    PermissionFlagType.CONNECTED_ACCOUNTS,
  );

  const isGoogleMessagingEnabled = useAtomStateValue(
    isGoogleMessagingEnabledState,
  );
  const isGoogleCalendarEnabled = useAtomStateValue(
    isGoogleCalendarEnabledState,
  );

  const isGoogleProviderEnabled =
    hasConnectedAccountsPermission &&
    (isGoogleMessagingEnabled || isGoogleCalendarEnabled);
  const hasProviderEnabled = isGoogleProviderEnabled;
  const isClientConfigLoaded = useAtomStateValue(
    clientConfigApiStatusState,
  ).isLoadedOnce;

  const connectWithProvider = async (provider: ConnectedAccountProvider) => {
    try {
      await triggerApisOAuth(provider, {
        redirectLocation: AppPath.Index,
        messageVisibility: MessageChannelVisibility.METADATA,
        calendarVisibility: CalendarChannelVisibility.METADATA,
        skipMessageChannelConfiguration: true,
      });
    } catch (error) {
      throw error;
    }
  };

  const providerActions = [
    {
      isEnabled: isGoogleProviderEnabled,
      label: t`Continue with Google`,
      Icon: IconGoogle,
      onClick: () => connectWithProvider(ConnectedAccountProvider.GOOGLE),
    },
  ].filter((providerAction) => providerAction.isEnabled);

  const handleSkipConfirm = async () => {
    await skipSyncEmailOnboardingStep({ isAutoSkipped: false });
  };

  const handleSkip = () => {
    if (!hasProviderEnabled) {
      void handleSkipConfirm();

      return;
    }

    openDialog(ONBOARDING_SKIP_DIALOG_IDS.syncEmails);
  };

  useOnboardingStepEnterHotkey({
    focusId: PageFocusId.SyncEmail,
    onEnter: handleSkip,
  });

  const handleAutoSkipError = useCallback(() => {
    setHasAutoSkipFailed(true);
  }, []);

  if (!isClientConfigLoaded || !isCurrentUserLoaded) {
    return null;
  }

  if (!hasProviderEnabled && !hasAutoSkipFailed) {
    return <SyncEmailsAutoSkipEffect onError={handleAutoSkipError} />;
  }

  return (
    <>
      <ImportContacts providerActions={providerActions} onSkip={handleSkip} />
      <OnboardingSkipDialog
        dialogId={ONBOARDING_SKIP_DIALOG_IDS.syncEmails}
        visual={
          <OnboardingSkipDialogAvatars
            avatars={ONBOARDING_NETWORK_PREVIEW_PEOPLE.map((person) => ({
              id: person.id,
              name: '',
              src: person.avatarUrl,
              shape: 'circle',
            }))}
          />
        }
        title={t`Start with your whole network`}
        description={t`Twenty adds the people you email and meet, and keeps them up to date without manual data entry.`}
        actions={providerActions}
        onSkip={() => void handleSkipConfirm()}
      />
    </>
  );
};
