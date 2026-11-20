import { RecordCalendarGridDay } from '@/object-record/record-calendar/grid/components/RecordCalendarGridDay';
import { RecordCalendarDragDropContext } from '@/object-record/record-calendar/components/RecordCalendarDragDropContext';
import { useRecordCalendarDaysRange } from '@/object-record/record-calendar/hooks/useRecordCalendarDaysRange';
import { recordCalendarSelectedDateComponentState } from '@/object-record/record-calendar/states/recordCalendarSelectedDateComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isPlainDateInSameMonth } from 'twenty-shared/utils';
import { ViewCalendarLayout } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    minWidth: '1000px',
  },
  containerDayLayout: {
    minWidth: '0',
  },
  header: {
    display: 'flex',
    height: '24px',
    width: '100%',
  },
  headerDay: {
    flex: '1',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'flex-end',
    height: '24px',
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0'],
  },
  body: {
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: '1',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  row: {
    flex: '1',
    alignItems: 'stretch',
    display: 'flex',
    borderBottomColor: {
      default: null,
      ':not(:last-of-type)': borderColor['--t-border-color-light'],
    },
    borderBottomStyle: { default: null, ':not(:last-of-type)': 'solid' },
    borderBottomWidth: { default: null, ':not(:last-of-type)': '1px' },
  },
});

type RecordCalendarGridProps = {
  calendarLayout: ViewCalendarLayout;
};

export const RecordCalendarGrid = ({
  calendarLayout,
}: RecordCalendarGridProps) => {
  const recordCalendarSelectedDate = useAtomComponentStateValue(
    recordCalendarSelectedDateComponentState,
  );
  const { days, weekDayLabels } = useRecordCalendarDaysRange(
    recordCalendarSelectedDate,
    calendarLayout,
  );

  return (
    <RecordCalendarDragDropContext>
      <div
        {...stylex.props(
          styles.container,
          calendarLayout === ViewCalendarLayout.DAY &&
            styles.containerDayLayout,
        )}
      >
        <div {...stylex.props(styles.header)}>
          {weekDayLabels.map((label, index) => (
            <div key={index} {...stylex.props(styles.headerDay)}>
              {label}
            </div>
          ))}
        </div>
        <div {...stylex.props(styles.body)}>
          {days.map((row) => (
            <div key={row[0].toString()} {...stylex.props(styles.row)}>
              {row.map((day) => (
                <RecordCalendarGridDay
                  key={day.toString()}
                  day={day}
                  isOtherMonth={
                    calendarLayout === ViewCalendarLayout.MONTH &&
                    !isPlainDateInSameMonth(day, recordCalendarSelectedDate)
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </RecordCalendarDragDropContext>
  );
};
