import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { RecordCalendarComponentInstanceContext } from '@/object-record/record-calendar/states/contexts/RecordCalendarComponentInstanceContext';
import { isRecordCalendarReadOnlyComponentState } from '@/object-record/record-calendar/states/isRecordCalendarReadOnlyComponentState';
import { recordCalendarSelectedDateComponentState } from '@/object-record/record-calendar/states/recordCalendarSelectedDateComponentState';
import { useRecordCalendarDaysRange } from '@/object-record/record-calendar/hooks/useRecordCalendarDaysRange';
import { formatRecordCalendarWeekRange } from '@/object-record/record-calendar/utils/formatRecordCalendarWeekRange';
import { recordIndexCalendarLayoutComponentState } from '@/object-record/record-index/states/recordIndexCalendarLayoutComponentState';
import { WidgetComponentInstanceContext } from '@/page-layout/widgets/states/contexts/WidgetComponentInstanceContext';
import { DatePickerWithoutCalendar } from '@/ui/input/components/internal/date/components/DatePickerWithoutCalendar';
import { TimeZoneAbbreviation } from '@/ui/input/components/internal/date/components/TimeZoneAbbreviation';
import { Select } from '@/ui/input/components/Select';
import { SelectControl } from '@/ui/input/components/SelectControl';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { Dropdown } from 'twenty-ui/components/navigation';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useAvailableComponentInstanceId } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceId';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useUpdateCurrentView } from '@/views/hooks/useUpdateCurrentView';
import { t } from '@lingui/core/macro';
import { format } from 'date-fns';
import { Temporal } from 'temporal-polyfill';
import { type Nullable } from 'twenty-shared/types';
import {
  isDefined,
  turnPlainDateToShiftedDateInSystemTimeZone,
} from 'twenty-shared/utils';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { ViewCalendarLayout } from '~/generated-metadata/graphql';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    height: '24px',
    justifyContent: 'space-between',
    width: '100%',
  },
  navigationButtonContainer: {
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  leftSection: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  navigationSection: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'flex-end',
  },
});

export const RecordCalendarTopBar = () => {
  const recordCalendarId = useAvailableComponentInstanceIdOrThrow(
    RecordCalendarComponentInstanceContext,
  );

  const [recordCalendarSelectedDate, setRecordCalendarSelectedDate] =
    useAtomComponentState(recordCalendarSelectedDateComponentState);

  const isRecordCalendarReadOnly = useAtomComponentStateValue(
    isRecordCalendarReadOnlyComponentState,
  );

  // The layout switcher writes the index view, so widget calendars must never render it.
  const widgetInstanceId = useAvailableComponentInstanceId(
    WidgetComponentInstanceContext,
  );
  const isInWidget = isDefined(widgetInstanceId);

  const [recordIndexCalendarLayout, setRecordIndexCalendarLayout] =
    useAtomComponentState(recordIndexCalendarLayoutComponentState);

  const dateLocale = useAtomStateValue(dateLocaleState);
  const { timeZone } = useDateTimeFormat();
  const { firstDay: firstDayOfWeek, lastDay: lastDayOfWeek } =
    useRecordCalendarDaysRange(
      recordCalendarSelectedDate,
      recordIndexCalendarLayout,
    );

  const { updateCurrentView } = useUpdateCurrentView();

  const datePickerDropdownId = `record-calendar-date-picker-${recordCalendarId}`;
  const { closeDropdown } = useCloseDropdown();

  const handleDateChange = (plainDateString: Nullable<string>) => {
    if (isDefined(plainDateString)) {
      setRecordCalendarSelectedDate(Temporal.PlainDate.from(plainDateString));
    }
    closeDropdown(datePickerDropdownId);
  };

  const handlePreviousPeriod = () => {
    const previousDate =
      recordIndexCalendarLayout === ViewCalendarLayout.DAY
        ? recordCalendarSelectedDate.subtract({ days: 1 })
        : recordIndexCalendarLayout === ViewCalendarLayout.WEEK
          ? recordCalendarSelectedDate.subtract({ weeks: 1 })
          : recordCalendarSelectedDate.subtract({ months: 1 });

    setRecordCalendarSelectedDate(previousDate);
  };

  const handleNextPeriod = () => {
    const nextDate =
      recordIndexCalendarLayout === ViewCalendarLayout.DAY
        ? recordCalendarSelectedDate.add({ days: 1 })
        : recordIndexCalendarLayout === ViewCalendarLayout.WEEK
          ? recordCalendarSelectedDate.add({ weeks: 1 })
          : recordCalendarSelectedDate.add({ months: 1 });

    setRecordCalendarSelectedDate(nextDate);
  };

  const handleCalendarLayoutChange = (calendarLayout: ViewCalendarLayout) => {
    setRecordIndexCalendarLayout(calendarLayout);
    void updateCurrentView({ calendarLayout });
  };

  const handleTodayClick = () => {
    setRecordCalendarSelectedDate(Temporal.Now.plainDateISO(timeZone));
  };

  const formattedDate =
    recordIndexCalendarLayout === ViewCalendarLayout.DAY
      ? recordCalendarSelectedDate.toLocaleString(dateLocale.locale, {
          dateStyle: 'full',
        })
      : recordIndexCalendarLayout === ViewCalendarLayout.WEEK
        ? formatRecordCalendarWeekRange({
            firstDayOfWeek,
            lastDayOfWeek,
            locale: dateLocale.localeCatalog,
          })
        : format(
            turnPlainDateToShiftedDateInSystemTimeZone(
              recordCalendarSelectedDate,
            ),
            'MMMM yyyy',
            { locale: dateLocale.localeCatalog },
          );

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.leftSection)}>
        {!isRecordCalendarReadOnly && !isInWidget && (
          <Select
            dropdownId={`record-calendar-layout-${recordCalendarId}`}
            value={recordIndexCalendarLayout}
            options={[
              { label: t`Day`, value: ViewCalendarLayout.DAY },
              { label: t`Week`, value: ViewCalendarLayout.WEEK },
              { label: t`Month`, value: ViewCalendarLayout.MONTH },
            ]}
            selectSizeVariant="small"
            dropdownWidth={120}
            onChange={handleCalendarLayoutChange}
          />
        )}
        <DropdownRoot dropdownId={datePickerDropdownId} type="panel">
          <Dropdown.Trigger render={<div />} nativeButton={false}>
            <SelectControl
              selectedOption={{
                label: formattedDate,
                value: formattedDate,
              }}
              selectSizeVariant="small"
            />
          </Dropdown.Trigger>
          <DropdownContent
            initialFocus={false}
            width="fit-content"
            align="end"
            alignOffset={-140}
            aria-label={t`Select date`}
          >
            <DatePickerWithoutCalendar
              instanceId={recordCalendarId}
              date={recordCalendarSelectedDate.toString()}
              onChange={handleDateChange}
              onClose={handleDateChange}
              onEnter={handleDateChange}
              onEscape={handleDateChange}
            />
          </DropdownContent>
        </DropdownRoot>
        <TimeZoneAbbreviation instant={Temporal.Now.instant()} />
      </div>

      <div {...stylex.props(styles.navigationSection)}>
        <div {...stylex.props(styles.navigationButtonContainer)}>
          <Button
            aria-label={t`Previous period`}
            size="sm"
            startIcon={<IconChevronLeft />}
            onClick={handlePreviousPeriod}
            variant="ghost"
          />
        </div>
        <Button
          size="sm"
          onClick={handleTodayClick}
          variant="ghost"
        >{t`Today`}</Button>
        <div {...stylex.props(styles.navigationButtonContainer)}>
          <Button
            aria-label={t`Next period`}
            size="sm"
            startIcon={<IconChevronRight />}
            onClick={handleNextPeriod}
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
};
