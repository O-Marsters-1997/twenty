import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { getTimezoneAbbreviationForZonedDateTime } from '@/ui/input/components/internal/date/utils/getTimeZoneAbbreviationForZonedDateTime';
import { isNonEmptyString, isString } from '@sniptt/guards';
import { Temporal } from 'temporal-polyfill';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  timezoneAbbreviation: {
    background: 'transparent',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    userSelect: 'none',
    width: 'fit-content',
  },
});

export const TimeZoneAbbreviation = ({
  instant,
  timeZone,
}: {
  instant: Temporal.Instant | string;
  timeZone?: string;
}) => {
  const { isSystemTimezone, userTimezone, systemTimeZone } = useUserTimezone();

  const shouldUseParamsTimeZone =
    isNonEmptyString(timeZone) && systemTimeZone !== timeZone;

  const shouldShowTimezoneAbbreviation =
    !isSystemTimezone || shouldUseParamsTimeZone;

  if (!shouldShowTimezoneAbbreviation) {
    return <></>;
  }

  const zonedDate = (
    isString(instant) ? Temporal.Instant.from(instant) : instant
  ).toZonedDateTimeISO(timeZone ?? userTimezone);

  return (
    <span {...stylex.props(styles.timezoneAbbreviation)}>
      {` ${getTimezoneAbbreviationForZonedDateTime(zonedDate)}`}
    </span>
  );
};
