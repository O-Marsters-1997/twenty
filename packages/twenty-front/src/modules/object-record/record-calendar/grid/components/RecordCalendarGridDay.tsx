import { RecordCalendarCardDraggableContainer } from '@/object-record/record-calendar/record-calendar-card/components/RecordCalendarCardDraggableContainer';
import { RECORD_CALENDAR_VISIBLE_RECORD_LIMIT } from '@/object-record/record-calendar/constants/RecordCalendarVisibleRecordLimit';
import { calendarDayRecordIdsComponentFamilySelector } from '@/object-record/record-calendar/states/selectors/calendarDayRecordsComponentFamilySelector';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { useAtomComponentFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue';
import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';
import { Fragment, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { isPlainDateInWeekend, isSamePlainDate } from 'twenty-shared/utils';
import { RecordCalendarAddNew } from '@/object-record/record-calendar/components/RecordCalendarAddNew';
import { RECORD_CALENDAR_CARD_DND_TYPE } from '@/object-record/record-calendar/constants/RecordCalendarCardDndType';
import { RECORD_CALENDAR_DAY_COLLISION_PRIORITY } from '@/object-record/record-calendar/constants/RecordCalendarDayCollisionPriority';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    backgroundColor: background['--t-background-primary'],
    borderRightColor: {
      default: null,
      ':not(:last-child)': borderColor['--t-border-color-light'],
    },
    borderRightStyle: {
      default: null,
      ':not(:last-child)': 'solid',
    },
    borderRightWidth: {
      default: null,
      ':not(:last-child)': '1px',
    },
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '122px',
    minWidth: '0',
    padding: spacing['--t-spacing-1'],
  },
  containerShaded: {
    backgroundColor: background['--t-background-secondary'],
  },
  containerOtherMonth: {
    color: fontColor['--t-font-color-light'],
  },
  dayHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '24px',
    justifyContent: 'space-between',
    marginLeft: 'none',
    width: '100%',
  },
  dayHeaderDayContainer: {
    display: 'flex',
    marginLeft: 'auto',
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-0_5'],
  },
  dayHeaderDay: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: '0',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: 'normal',
    justifyContent: 'center',
    lineHeight: '140%',
    width: '20px',
  },
  dayHeaderDayToday: {
    backgroundColor: color['--t-color-blue'],
    borderRadius: '4px',
    color: fontColor['--t-font-color-inverted'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  cardsContainer: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '60px',
    transitionDuration: '0.1s',
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
  },
  cardsContainerDraggedOver: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'dashed',
    borderWidth: '1px',
  },
});

type RecordCalendarGridDayProps = {
  day: Temporal.PlainDate;
  isOtherMonth: boolean;
};

export const RecordCalendarGridDay = ({
  day,
  isOtherMonth,
}: RecordCalendarGridDayProps) => {
  const { userTimezone } = useUserTimezone();

  const dayKey = day.toString();

  const recordIds = useAtomComponentFamilySelectorValue(
    calendarDayRecordIdsComponentFamilySelector,
    {
      day: day,
      timeZone: userTimezone,
    },
  );

  const todayInUserTimeZone =
    Temporal.Now.zonedDateTimeISO(userTimezone).toPlainDate();

  const [hovered, setHovered] = useState(false);

  const isToday = isSamePlainDate(day, todayInUserTimeZone);

  const isDayOfWeekend = isPlainDateInWeekend(day);

  const { isDropTarget, ref: dropRef } = useDroppable({
    id: dayKey,
    collisionPriority: RECORD_CALENDAR_DAY_COLLISION_PRIORITY,
    collisionDetector: pointerIntersection,
    type: RECORD_CALENDAR_CARD_DND_TYPE,
    accept: RECORD_CALENDAR_CARD_DND_TYPE,
  });

  const visibleRecordIds = recordIds.slice(
    0,
    RECORD_CALENDAR_VISIBLE_RECORD_LIMIT,
  );

  return (
    <div
      ref={dropRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...stylex.props(
        styles.container,
        (isOtherMonth || isDayOfWeekend) && styles.containerShaded,
        isOtherMonth && styles.containerOtherMonth,
      )}
    >
      <div {...stylex.props(styles.dayHeader)}>
        {hovered && <RecordCalendarAddNew cardDate={day} />}
        <div {...stylex.props(styles.dayHeaderDayContainer)}>
          <span
            {...stylex.props(
              styles.dayHeaderDay,
              isToday && styles.dayHeaderDayToday,
            )}
          >
            {day.day}
          </span>
        </div>
      </div>
      <div
        {...stylex.props(
          styles.cardsContainer,
          isDropTarget && styles.cardsContainerDraggedOver,
        )}
      >
        {visibleRecordIds.map((recordId, index) => (
          <Fragment key={`${recordId}-${dayKey}`}>
            <DragDropItemDropTarget
              index={index}
              droppableId={dayKey}
              orientation="horizontal"
              compact
            />
            <RecordCalendarCardDraggableContainer
              calendarDay={dayKey}
              recordId={recordId}
              index={index}
            />
          </Fragment>
        ))}
        <DragDropItemDropTarget
          index={visibleRecordIds.length}
          droppableId={dayKey}
          orientation="horizontal"
          compact
        />
      </div>
    </div>
  );
};
