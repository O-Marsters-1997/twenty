import { useIMask } from 'react-imask';

import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { DATE_BLOCKS } from '@/ui/input/components/internal/date/constants/DateBlocks';
import { MAX_DATE } from '@/ui/input/components/internal/date/constants/MaxDate';
import { MIN_DATE } from '@/ui/input/components/internal/date/constants/MinDate';
import { getDateTimeMask } from '@/ui/input/components/internal/date/utils/getDateTimeMask';
import { getTimeBlocks } from '@/ui/input/components/internal/date/utils/getTimeBlocks';
import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';

import { TimeZoneAbbreviation } from '@/ui/input/components/internal/date/components/TimeZoneAbbreviation';
import { useGetShiftedDateToCustomTimeZone } from '@/ui/input/components/internal/date/hooks/useGetShiftedDateToCustomTimeZone';
import { useGetShiftedDateToSystemTimeZone } from '@/ui/input/components/internal/date/hooks/useGetShiftedDateToSystemTimeZone';
import { useParseDateTimeInputStringToJSDate } from '@/ui/input/components/internal/date/hooks/useParseDateTimeInputStringToJSDate';
import { useParseJSDateToIMaskDateTimeInputString } from '@/ui/input/components/internal/date/hooks/useParseJSDateToIMaskDateTimeInputString';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { useEffect, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { isDifferentZonedDateTime } from '~/utils/dates/isDifferentZonedDateTime';

type DateTimePickerInputProps = {
  onChange?: (date: Temporal.ZonedDateTime | null) => void;
  date: Temporal.ZonedDateTime | null;
  onFocus?: () => void;
  readonly?: boolean;
  timeZone?: string;
  variant?: FormFieldInputVariant;
};

export const DateTimePickerInput = ({
  date,
  onChange,
  onFocus,
  readonly,
  timeZone,
  variant = 'default',
}: DateTimePickerInputProps) => {
  const isTransparent = variant === 'transparent';
  const [internalDate, setInternalDate] = useState(date);

  const { userTimezone } = useUserTimezone();

  const { dateFormat, timeFormat } = useDateTimeFormat();

  const { getShiftedDateToSystemTimeZone } =
    useGetShiftedDateToSystemTimeZone();

  const { getShiftedDateToCustomTimeZone } =
    useGetShiftedDateToCustomTimeZone();

  const { parseDateTimeInputStringToJSDate } =
    useParseDateTimeInputStringToJSDate();
  const { parseJSDateToDateTimeInputString } =
    useParseJSDateToIMaskDateTimeInputString();

  const handleParseStringToDate = (newDateAsString: string) => {
    const date = parseDateTimeInputStringToJSDate(newDateAsString);

    return date;
  };

  const pattern = getDateTimeMask({ dateFormat, timeFormat });

  const blocks = { ...DATE_BLOCKS, ...getTimeBlocks(timeFormat) };

  const defaultValueForIMask = isDefined(internalDate)
    ? new Date(internalDate?.toInstant().toString())
    : null;

  const shiftedIMaskDate = isDefined(defaultValueForIMask)
    ? getShiftedDateToSystemTimeZone(
        defaultValueForIMask,
        timeZone ?? userTimezone,
      )
    : null;

  const { ref, setValue } = useIMask(
    {
      mask: Date,
      pattern,
      blocks,
      min: MIN_DATE,
      max: MAX_DATE,
      format: (date: any) => parseJSDateToDateTimeInputString(date),
      parse: handleParseStringToDate,
      lazy: false,
      autofix: false,
    },
    {
      defaultValue: isDefined(shiftedIMaskDate)
        ? parseJSDateToDateTimeInputString(shiftedIMaskDate)
        : undefined,
      onComplete: (value) => {
        const parsedDate = parseDateTimeInputStringToJSDate(value);

        if (!isDefined(parsedDate)) {
          return;
        }

        const pointInTime = getShiftedDateToCustomTimeZone(
          parsedDate,
          timeZone ?? userTimezone,
        );

        setInternalDate(date);

        const zonedDateTime = Temporal.Instant.from(
          pointInTime.toISOString(),
        ).toZonedDateTimeISO(timeZone ?? userTimezone);

        onChange?.(zonedDateTime);
      },
    },
  );

  useEffect(() => {
    if (isDifferentZonedDateTime(internalDate, date)) {
      setInternalDate(date);

      if (!isDefined(date)) {
        setValue('');
        return;
      }

      const newDateAsDate = new Date(date.toInstant().toString());

      const newShiftedDate = getShiftedDateToSystemTimeZone(
        newDateAsDate,
        timeZone ?? userTimezone,
      );

      setValue(parseJSDateToDateTimeInputString(newShiftedDate));
    }
  }, [
    date,
    internalDate,
    parseJSDateToDateTimeInputString,
    setValue,
    shiftedIMaskDate,
    timeZone,
    getShiftedDateToSystemTimeZone,
    userTimezone,
  ]);

  const shouldDisplayReadOnly = readonly === true;

  const internalDateForTimeZoneAbbreviation =
    internalDate?.toInstant() ?? Temporal.Now.instant();

  return (
    <div
      {...stylex.props(
        styles.container,
        isTransparent ? styles.containerTransparent : styles.containerDefault,
      )}
    >
      <input
        {...stylex.props(
          styles.input,
          isTransparent ? styles.inputTransparent : styles.inputDefault,
        )}
        disabled={shouldDisplayReadOnly}
        type="text"
        ref={ref as any}
        onFocus={!shouldDisplayReadOnly ? onFocus : undefined}
      />
      <TimeZoneAbbreviation
        instant={internalDateForTimeZoneAbbreviation}
        timeZone={timeZone ?? userTimezone}
      />
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    width: '100%',
  },
  containerDefault: {
    height: spacing['--t-spacing-8'],
  },
  containerTransparent: {
    height: spacing['--t-spacing-6'],
  },
  input: {
    borderStyle: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    width: '140px',
  },
  inputDefault: {
    fontWeight: 500,
    paddingLeft: spacing['--t-spacing-2'],
  },
  inputTransparent: {
    fontWeight: fontWeight['--t-font-weight-regular'],
    paddingLeft: 0,
  },
});
