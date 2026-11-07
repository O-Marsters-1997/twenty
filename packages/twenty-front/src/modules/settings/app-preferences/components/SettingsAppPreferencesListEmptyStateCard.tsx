import { isGoogleCalendarEnabledState } from '@/client-config/states/isGoogleCalendarEnabledState';
import { isGoogleMessagingEnabledState } from '@/client-config/states/isGoogleMessagingEnabledState';
import { useTriggerApisOAuth } from '@/settings/accounts/hooks/useTriggerApiOAuth';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconGoogle } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

const StyledCardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

type SettingsAppPreferencesListEmptyStateCardProps = {
  provider?: ConnectedAccountProvider;
};

export const SettingsAppPreferencesListEmptyStateCard = ({
  provider,
}: SettingsAppPreferencesListEmptyStateCardProps) => {
  const theme = useTheme();
  const { triggerApisOAuth } = useTriggerApisOAuth();

  const { t } = useLingui();

  const isGoogleMessagingEnabled = useAtomStateValue(
    isGoogleMessagingEnabledState,
  );

  const isGoogleCalendarEnabled = useAtomStateValue(
    isGoogleCalendarEnabledState,
  );

  const isProviderShown = (shownProvider: ConnectedAccountProvider) =>
    !isDefined(provider) || provider === shownProvider;

  return (
    <StyledCardsContainer>
      {isProviderShown(ConnectedAccountProvider.GOOGLE) &&
        (isGoogleMessagingEnabled || isGoogleCalendarEnabled) && (
          <SettingsCard
            Icon={<IconGoogle size={theme.icon.size.md} />}
            title={t`Connect with Google`}
            onClick={() => triggerApisOAuth(ConnectedAccountProvider.GOOGLE)}
          />
        )}
    </StyledCardsContainer>
  );
};
