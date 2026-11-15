import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import {
  convertFirstDayOfTheWeekToCalendarStartDayNumber,
  isDefined,
  isSubDayRelativeDateFilterUnit,
  type RelativeDateFilter,
} from 'twenty-shared/utils';

import { DateTimePickerHeader } from '@/ui/input/components/internal/date/components/DateTimePickerHeader';
import { RelativeDatePickerHeader } from '@/ui/input/components/internal/date/components/RelativeDatePickerHeader';
import { RelativeDateTimeRangeText } from '@/ui/input/components/internal/date/components/RelativeDateTimeRangeText';
import { StyledDatePickerContainer } from '@/ui/input/components/internal/date/components/StyledDatePickerContainer';
import { getRelativeDatePickerCalendarRange } from '@/ui/input/components/internal/date/utils/getRelativeDatePickerCalendarRange';
import { t } from '@lingui/core/macro';
import { Suspense, lazy, type ComponentType } from 'react';
import type { DatePickerProps as ReactDatePickerLibProps } from 'react-datepicker';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

import '~/third-party-styles/react-datepicker.css';

import { IconCalendarX } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';

import { useGetShiftedDateToSystemTimeZone } from '@/ui/input/components/internal/date/hooks/useGetShiftedDateToSystemTimeZone';
import { useUserFirstDayOfTheWeek } from '@/ui/input/components/internal/date/hooks/useUserFirstDayOfTheWeek';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { Temporal } from 'temporal-polyfill';

import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, backgroundTransparent, borderColor, borderRadius, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  outerWrapper: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    width: '280px',
  },
  separator: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    width: '100%',
  },
  buttonContainer: {
    alignItems: 'center',
    borderTopLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderTopRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    height: '32px',
    marginTop: spacing['--t-spacing-1'],
    marginRight: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-1'],
    marginLeft: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: 'auto',
    background: { default: null, ':hover': backgroundTransparent['--t-background-transparent-light'] },
  },
  buttonContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'start',
  },
  datePickerFallback: {
    alignItems: 'center',
    background: background['--t-background-secondary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    height: '300px',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    width: '280px',
  },
});

type DateTimePickerProps = {
  instanceId: string;
  isRelative?: boolean;
  hideHeaderInput?: boolean;
  date: Temporal.ZonedDateTime | null;
  relativeDate?: RelativeDateFilter & {
    start: Temporal.ZonedDateTime;
    end?: Temporal.ZonedDateTime;
  };
  onClose?: (date: Temporal.ZonedDateTime | null) => void;
  onChange?: (date: Temporal.ZonedDateTime | null) => void;
  onRelativeDateChange?: (
    relativeDateFilter: RelativeDateFilter | null,
  ) => void;
  clearable?: boolean;
  onEnter?: (date: Temporal.ZonedDateTime | null) => void;
  onEscape?: (date: Temporal.ZonedDateTime | null) => void;
  keyboardEventsDisabled?: boolean;
  onClear?: () => void;
  timeZone?: string;
};

// react-datepicker v9 types its props as a discriminated union keyed on
// selectsRange/selectsMultiple. We drive selectsRange dynamically (relative
// filters highlight a contiguous range), which TS cannot narrow to a single
// union branch, so collapse the discriminants to plain optionals.
type DatePickerPropsType = Omit<
  ReactDatePickerLibProps,
  'selectsRange' | 'selectsMultiple' | 'onChange' | 'formatMultipleDates'
> & {
  selectsRange?: boolean;
  onChange?: (date: Date | null) => void;
};

const ReactDatePicker = lazy<ComponentType<DatePickerPropsType>>(() =>
  import('react-datepicker').then((mod) => ({
    // react-datepicker ships CJS; under vite 8 this dynamic import's `default`
    // can be the module namespace ({ default: Component }) rather than the
    // component itself, so unwrap a nested default when present.
    default: ((mod.default as any)?.default ??
      mod.default) as unknown as ComponentType<DatePickerPropsType>,
  })),
);

export const DateTimePicker = ({
  instanceId,
  date,
  onChange,
  onClose,
  clearable = true,
  onClear,
  isRelative,
  relativeDate,
  onRelativeDateChange,
  hideHeaderInput,
  timeZone,
}: DateTimePickerProps) => {
  const theme = useTheme();
  const { userFirstDayOfTheWeek } = useUserFirstDayOfTheWeek();

  const { userTimezone } = useUserTimezone();

  const dateToUse =
    date ?? Temporal.Now.zonedDateTimeISO(timeZone ?? userTimezone);

  const { getShiftedDateToSystemTimeZone } =
    useGetShiftedDateToSystemTimeZone();

  const getZonedDateTimeFromDatePicked = (datePicked: Date) => {
    const plainDatePart = Temporal.PlainDate.from({
      day: datePicked.getDate(),
      month: datePicked.getMonth() + 1,
      year: datePicked.getFullYear(),
    });

    const zonedDateTime = plainDatePart
      .toZonedDateTime(timeZone ?? userTimezone)
      .with({
        hour: dateToUse?.hour ?? 0,
        minute: dateToUse?.minute ?? 0,
      });

    return { zonedDateTime };
  };

  const handleChangeMonth = (month: number) => {
    const newZonedDateTime = dateToUse?.with({ month: month }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleAddMonth = () => {
    const newZonedDateTime = dateToUse?.add({ months: 1 }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleSubtractMonth = () => {
    const newZonedDateTime = dateToUse?.subtract({ months: 1 }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleChangeYear = (year: number) => {
    const newZonedDateTime = dateToUse?.with({ year: year }) ?? null;

    onChange?.(newZonedDateTime);
  };

  const handleDateChange = (newDate: Date | null) => {
    if (!isDefined(newDate)) {
      return;
    }
    const { zonedDateTime } = getZonedDateTimeFromDatePicked(newDate);

    onChange?.(zonedDateTime);
  };

  const handleDateSelect = (newDate: Date | null) => {
    if (!isDefined(newDate)) {
      return;
    }
    const { zonedDateTime } = getZonedDateTimeFromDatePicked(newDate);

    onClose?.(zonedDateTime);
  };

  const relativeUnit = relativeDate?.unit ?? 'DAY';
  const relativeRangeStart = isRelative ? relativeDate?.start : undefined;
  const relativeRangeEnd = isRelative ? relativeDate?.end : undefined;

  const isSubDayRelativeUnit =
    isRelative === true && isSubDayRelativeDateFilterUnit(relativeUnit);

  const relativeRangeStartPlainDate = isDefined(relativeRangeStart)
    ? relativeRangeStart.toPlainDate()
    : null;

  const relativeRangeEndPlainDate = isDefined(relativeRangeEnd)
    ? relativeRangeEnd.subtract({ nanoseconds: 1 }).toPlainDate()
    : null;

  const {
    startDate: relativeRangeStartDate,
    endDate: relativeRangeEndDate,
    rangeKey: relativeDateRangeKey,
  } = getRelativeDatePickerCalendarRange(
    relativeRangeStartPlainDate,
    relativeRangeEndPlainDate,
  );

  const nonShiftedDateForReactDatePicker = new Date(
    dateToUse.toInstant().toString(),
  );

  const shiftedDateForReactDatePicker = getShiftedDateToSystemTimeZone(
    nonShiftedDateForReactDatePicker,
    timeZone ?? userTimezone,
  );

  const calendarStartDayNumber =
    convertFirstDayOfTheWeekToCalendarStartDayNumber(userFirstDayOfTheWeek);

  return (
    <div {...stylex.props(styles.outerWrapper)}>
      <StyledDatePickerContainer
        calendarDisabled={isRelative && !isSubDayRelativeUnit}
      >
        {isSubDayRelativeUnit ? (
          <>
            <RelativeDatePickerHeader
              instanceId={instanceId}
              direction={relativeDate?.direction ?? 'PAST'}
              amount={relativeDate?.amount}
              unit={relativeUnit}
              onChange={onRelativeDateChange}
              allowIntraDayUnits={true}
            />
            {isDefined(relativeRangeStart) && isDefined(relativeRangeEnd) && (
              <RelativeDateTimeRangeText
                start={relativeRangeStart}
                end={relativeRangeEnd}
              />
            )}
          </>
        ) : (
          <Suspense
            fallback={
              <div {...stylex.props(styles.datePickerFallback)}>
                <SkeletonLine width={200} height={SKELETON_HEIGHT_SIZES.m} />
                <SkeletonLine width={240} height={SKELETON_HEIGHT_SIZES.l} />
                <SkeletonLine width={220} height={SKELETON_HEIGHT_SIZES.m} />
                <SkeletonLine width={180} height={SKELETON_HEIGHT_SIZES.s} />
              </div>
            }
          >
            <ReactDatePicker
              key={relativeDateRangeKey}
              open={true}
              disabledKeyboardNavigation
              onChange={handleDateChange}
              onSelect={handleDateSelect}
              openToDate={
                isRelative
                  ? relativeRangeStartDate
                  : shiftedDateForReactDatePicker
              }
              selectsRange={isRelative ? true : undefined}
              startDate={isRelative ? relativeRangeStartDate : undefined}
              endDate={isRelative ? relativeRangeEndDate : undefined}
              selected={isRelative ? undefined : shiftedDateForReactDatePicker}
              calendarStartDay={
                calendarStartDayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
              }
              renderCustomHeader={({
                monthDate,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) =>
                isRelative ? (
                  <RelativeDatePickerHeader
                    instanceId={instanceId}
                    direction={relativeDate?.direction ?? 'PAST'}
                    amount={relativeDate?.amount}
                    unit={relativeUnit}
                    onChange={onRelativeDateChange}
                    allowIntraDayUnits={true}
                    calendarMonthDate={monthDate}
                    onPreviousMonth={decreaseMonth}
                    onNextMonth={increaseMonth}
                    prevMonthButtonDisabled={prevMonthButtonDisabled}
                    nextMonthButtonDisabled={nextMonthButtonDisabled}
                  />
                ) : (
                  <DateTimePickerHeader
                    instanceId={instanceId}
                    date={dateToUse}
                    onChange={onChange}
                    onAddMonth={handleAddMonth}
                    onSubtractMonth={handleSubtractMonth}
                    prevMonthButtonDisabled={prevMonthButtonDisabled}
                    nextMonthButtonDisabled={nextMonthButtonDisabled}
                    hideInput={hideHeaderInput}
                    onChangeMonth={handleChangeMonth}
                    onChangeYear={handleChangeYear}
                  />
                )
              }
            />
          </Suspense>
        )}
        {clearable && (
          <>
            <div {...stylex.props(styles.separator)} />
            <div onClick={() => onClear?.()} {...stylex.props(styles.buttonContainer)}>
              <div {...stylex.props(styles.buttonContent)}>
                <IconCalendarX size={theme.icon.size.md} />
                <Text>{t`Clear`}</Text>
              </div>
            </div>
          </>
        )}
      </StyledDatePickerContainer>
    </div>
  );
};
