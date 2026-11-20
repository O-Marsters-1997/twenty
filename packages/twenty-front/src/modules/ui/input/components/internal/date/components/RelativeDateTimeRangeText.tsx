import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type Temporal } from 'temporal-polyfill';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { IconArrowDown } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    minHeight: '96px',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-4'],
  },
  bound: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

type RelativeDateTimeRangeTextProps = {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
};

export const RelativeDateTimeRangeText = ({
  start,
  end,
}: RelativeDateTimeRangeTextProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const userLocale = currentWorkspaceMember?.locale ?? SOURCE_LOCALE;

  const formatter = new Intl.DateTimeFormat(userLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: start.timeZoneId,
  });

  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.bound)}>
        {formatter.format(new Date(start.epochMilliseconds))}
      </span>
      <IconArrowDown size={14} color={themeCssVariables.font.color.tertiary} />
      <span {...stylex.props(styles.bound)}>
        {formatter.format(new Date(end.epochMilliseconds))}
      </span>
    </div>
  );
};
