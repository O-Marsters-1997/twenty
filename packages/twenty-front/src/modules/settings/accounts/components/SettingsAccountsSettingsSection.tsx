import { SettingsCard } from '@/settings/components/SettingsCard';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconCalendarEvent, IconMailCog } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  cardsContainer: {
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: { default: null, [media.mobile]: 'column' },
    marginTop: spacing['--t-spacing-6'],
  },
  cardLinkSlot: {
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: '0',
    minWidth: '0',
  },
});

export const SettingsAccountsSettingsSection = () => {
  const theme = useTheme();
  const { t } = useLingui();
  return (
    <Section.Root>
      <Section.Header
        title={t`Settings`}
        description={t`Configure your emails and calendar settings.`}
      />
      <div {...stylex.props(styles.cardsContainer)}>
        <div {...stylex.props(styles.cardLinkSlot)}>
          <UndecoratedLink to={getSettingsPath(SettingsPath.AccountsEmails)}>
            <SettingsCard
              Icon={
                <IconMailCog
                  size={theme.icon.size.lg}
                  stroke={theme.icon.stroke.sm}
                />
              }
              title={t`Emails`}
              description={t`Set email visibility, manage your blocklist and more.`}
            />
          </UndecoratedLink>
        </div>
        <div {...stylex.props(styles.cardLinkSlot)}>
          <UndecoratedLink to={getSettingsPath(SettingsPath.AccountsCalendars)}>
            <SettingsCard
              Icon={
                <IconCalendarEvent
                  size={theme.icon.size.lg}
                  stroke={theme.icon.stroke.sm}
                />
              }
              title={t`Calendar`}
              description={t`Configure and customize your calendar preferences.`}
            />
          </UndecoratedLink>
        </div>
      </div>
    </Section.Root>
  );
};
