import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { Suspense, lazy, type ComponentType } from 'react';
import type { DatePickerProps as ReactDatePickerLibProps } from 'react-datepicker';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { CalendarStartDay } from 'twenty-shared/constants';

import { detectCalendarStartDay } from '@/localization/utils/detection/detectCalendarStartDay';
import { DatePickerHeader } from '@/ui/input/components/internal/date/components/DatePickerHeader';
import {
  DATE_PICKER_CONTAINER_WIDTH,
  StyledDatePickerContainer,
} from '@/ui/input/components/internal/date/components/StyledDatePickerContainer';
import '~/third-party-styles/react-datepicker.css';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Temporal } from 'temporal-polyfill';
import { type Nullable } from 'twenty-shared/types';
import { isDefined, turnJSDateToPlainDate } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const DATE_PICKER_SKELETON_PADDING = 16;

const styles = stylex.create({
  spacer: {
    height: spacing['--t-spacing-2'],
    width: 'auto',
  },
  datePickerFallback: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: '300px',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
    width: '280px',
  },
});

type DatePickerWithoutCalendarProps = {
  instanceId: string;

  date: Nullable<string>;

  onClose?: (date: string | null) => void;
  onChange?: (date: string | null) => void;

  onEnter?: (date: string | null) => void;
  onEscape?: (date: string | null) => void;
  keyboardEventsDisabled?: boolean;
};

type DatePickerPropsType = ReactDatePickerLibProps;

const ReactDatePicker = lazy<ComponentType<DatePickerPropsType>>(() =>
  import('react-datepicker').then((mod) => ({
    // react-datepicker ships CJS; under vite 8 this dynamic import's `default`
    // can be the module namespace ({ default: Component }) rather than the
    // component itself, so unwrap a nested default when present.
    default: ((mod.default as any)?.default ??
      mod.default) as unknown as ComponentType<DatePickerPropsType>,
  })),
);

export const DatePickerWithoutCalendar = ({
  instanceId,
  date,
  onChange,
  onClose,
}: DatePickerWithoutCalendarProps) => {
  const plainDate = isDefined(date) ? Temporal.PlainDate.from(date) : null;

  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const handleChangeMonth = (month: number) => {
    const newDate = plainDate?.with({ month: month });

    onChange?.(newDate?.toString() ?? null);
  };

  const handleAddMonth = () => {
    const newDate = plainDate?.add({ months: 1 });

    onChange?.(newDate?.toString() ?? null);
  };

  const handleSubtractMonth = () => {
    const newDate = plainDate?.subtract({ months: 1 });

    onChange?.(newDate?.toString() ?? null);
  };

  const handleChangeYear = (year: number) => {
    const newDate = plainDate?.with({ year: year });

    onChange?.(newDate?.toString() ?? null);
  };

  const handleDateChange = (datePicked: Date | null) => {
    if (!isDefined(datePicked)) {
      return;
    }
    const plainDatePicked = turnJSDateToPlainDate(datePicked);

    onChange?.(plainDatePicked.toString());
  };

  const handleDateSelect = (datePicked: Date | null) => {
    if (!isDefined(datePicked)) {
      return;
    }
    const plainDatePicked = turnJSDateToPlainDate(datePicked);

    onClose?.(plainDatePicked.toString());
  };

  const calendarStartDay =
    currentWorkspaceMember?.calendarStartDay === CalendarStartDay.SYSTEM
      ? CalendarStartDay[detectCalendarStartDay()]
      : (currentWorkspaceMember?.calendarStartDay ?? undefined);

  const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dateShiftedToISOString = plainDate
    ?.toZonedDateTime(systemTimeZone)
    .toInstant()
    .toString();

  const dateForDatePicker = isDefined(dateShiftedToISOString)
    ? new Date(dateShiftedToISOString)
    : null;

  return (
    <StyledDatePickerContainer hideCalendar={true}>
      <div>
        <Suspense
          fallback={
            <div {...stylex.props(styles.datePickerFallback)}>
              <SkeletonLine
                width={
                  DATE_PICKER_CONTAINER_WIDTH - DATE_PICKER_SKELETON_PADDING
                }
                height={SKELETON_HEIGHT_SIZES.l}
                borderRadius={2}
              />
              <SkeletonLine
                width={
                  DATE_PICKER_CONTAINER_WIDTH - DATE_PICKER_SKELETON_PADDING
                }
                height={SKELETON_HEIGHT_SIZES.l}
                borderRadius={2}
              />
              <SkeletonLine
                width={
                  DATE_PICKER_CONTAINER_WIDTH - DATE_PICKER_SKELETON_PADDING
                }
                height={SKELETON_HEIGHT_SIZES.l}
                borderRadius={2}
              />
              <SkeletonLine
                width={
                  DATE_PICKER_CONTAINER_WIDTH - DATE_PICKER_SKELETON_PADDING
                }
                height={SKELETON_HEIGHT_SIZES.l}
                borderRadius={2}
              />
            </div>
          }
        >
          <ReactDatePicker
            open={true}
            selected={dateForDatePicker}
            openToDate={dateForDatePicker ?? undefined}
            disabledKeyboardNavigation
            onChange={handleDateChange}
            calendarStartDay={
              calendarStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
            }
            renderCustomHeader={({
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }) => (
              <>
                <DatePickerHeader
                  instanceId={instanceId}
                  date={plainDate?.toString() ?? null}
                  onChange={onChange}
                  onChangeMonth={handleChangeMonth}
                  onChangeYear={handleChangeYear}
                  onAddMonth={handleAddMonth}
                  onSubtractMonth={handleSubtractMonth}
                  prevMonthButtonDisabled={prevMonthButtonDisabled}
                  nextMonthButtonDisabled={nextMonthButtonDisabled}
                  hideInput={true}
                />
                <div {...stylex.props(styles.spacer)} />
              </>
            )}
            onSelect={handleDateSelect}
          />
        </Suspense>
      </div>
    </StyledDatePickerContainer>
  );
};
