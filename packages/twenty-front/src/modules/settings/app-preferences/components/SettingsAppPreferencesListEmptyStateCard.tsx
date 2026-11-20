import { isGoogleCalendarEnabledState } from '@/client-config/states/isGoogleCalendarEnabledState';
import { isGoogleMessagingEnabledState } from '@/client-config/states/isGoogleMessagingEnabledState';
import { useTriggerApisOAuth } from '@/settings/accounts/hooks/useTriggerApiOAuth';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconGoogle } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  cardsContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
});

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
    <div {...stylex.props(styles.cardsContainer)}>
      {isProviderShown(ConnectedAccountProvider.GOOGLE) &&
        (isGoogleMessagingEnabled || isGoogleCalendarEnabled) && (
          <SettingsCard
            Icon={<IconGoogle size={theme.icon.size.md} />}
            title={t`Connect with Google`}
            onClick={() => triggerApisOAuth(ConnectedAccountProvider.GOOGLE)}
          />
        )}
    </div>
  );
};
