import { isGoogleCalendarEnabledState } from '@/client-config/states/isGoogleCalendarEnabledState';
import { isGoogleMessagingEnabledState } from '@/client-config/states/isGoogleMessagingEnabledState';
import { isImapSmtpCaldavEnabledState } from '@/client-config/states/isImapSmtpCaldavEnabledState';
import { useTriggerApisOAuth } from '@/settings/accounts/hooks/useTriggerApiOAuth';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { ConnectedAccountProvider, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { IconAt, IconGoogle } from 'twenty-ui/icon';
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

  const isImapSmtpCaldavEnabled = useAtomStateValue(
    isImapSmtpCaldavEnabledState,
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

      {isProviderShown(ConnectedAccountProvider.IMAP_SMTP_CALDAV) &&
        isImapSmtpCaldavEnabled && (
          <UndecoratedLink
            to={getSettingsPath(SettingsPath.NewImapSmtpCaldavConnection)}
          >
            <SettingsCard
              Icon={<IconAt size={theme.icon.size.md} />}
              title={t`Connect via IMAP/SMTP`}
            />
          </UndecoratedLink>
        )}
    </StyledCardsContainer>
  );
};
