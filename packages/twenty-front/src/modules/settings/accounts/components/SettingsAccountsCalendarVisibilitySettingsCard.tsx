import * as stylex from '@stylexjs/stylex';

import { SettingsAccountsVisibilityIcon } from '@/settings/accounts/components/SettingsAccountsVisibilityIcon';
import { SettingsRadioSettingsCard } from '@/settings/components/SettingsRadioSettingsCard';
import { msg } from '@lingui/core/macro';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { CalendarChannelVisibility } from '~/generated-metadata/graphql';

type SettingsAccountsEventVisibilitySettingsCardProps = {
  onChange: (nextValue: CalendarChannelVisibility) => void;
  value?: CalendarChannelVisibility;
};

const styles = stylex.create({
  cardMedia: {
    height: spacing['--t-spacing-8'],
  },
});

const eventSettingsVisibilityOptions = [
  {
    title: msg`Everything`,
    description: msg`The whole event details will be shared with your team.`,
    value: CalendarChannelVisibility.SHARE_EVERYTHING,
    cardMedia: (
      <SettingsAccountsVisibilityIcon
        subject="active"
        body="active"
        xstyle={styles.cardMedia}
      />
    ),
  },
  {
    title: msg`Metadata`,
    description: msg`Only date & participants will be shared with your team.`,
    value: CalendarChannelVisibility.METADATA,
    cardMedia: (
      <SettingsAccountsVisibilityIcon
        subject="active"
        body="inactive"
        xstyle={styles.cardMedia}
      />
    ),
  },
];

export const SettingsAccountsEventVisibilitySettingsCard = ({
  onChange,
  value = CalendarChannelVisibility.SHARE_EVERYTHING,
}: SettingsAccountsEventVisibilitySettingsCardProps) => (
  <SettingsRadioSettingsCard
    name="event-visibility"
    options={eventSettingsVisibilityOptions}
    value={value}
    onChange={onChange}
  />
);
