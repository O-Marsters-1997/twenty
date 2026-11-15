import { pointerIntersection } from '@dnd-kit/collision';

import { RECORD_CALENDAR_CARD_DND_TYPE } from '@/object-record/record-calendar/constants/RecordCalendarCardDndType';
import { RecordCalendarCard } from '@/object-record/record-calendar/record-calendar-card/components/RecordCalendarCard';
import { useIsRecordCalendarCardDragDisabled } from '@/object-record/record-calendar/record-calendar-card/hooks/useIsRecordCalendarCardDragDisabled';
import { getRecordCalendarCardDraggableId } from '@/object-record/record-calendar/record-calendar-card/utils/getRecordCalendarCardDraggableId';
import { DragDropItemSortableCell } from '@/ui/utilities/drag-and-drop/components/DragDropItemSortableCell';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  draggableContainer: {
    position: 'relative',
    scrollMarginLeft: '8px',
    scrollMarginRight: '8px',
    scrollMarginTop: '8px',
  },
});

export const RecordCalendarCardDraggableContainer = ({
  calendarDay,
  recordId,
  index,
}: {
  calendarDay: string;
  recordId: string;
  index: number;
}) => {
  const dragIsDisabled = useIsRecordCalendarCardDragDisabled(recordId);

  const draggableId = getRecordCalendarCardDraggableId({
    calendarDay,
    recordId,
  });

  return (
    <DragDropItemSortableCell
      id={draggableId}
      index={index}
      group={calendarDay}
      type={RECORD_CALENDAR_CARD_DND_TYPE}
      accept={RECORD_CALENDAR_CARD_DND_TYPE}
      data={{ recordId }}
      collisionDetector={pointerIntersection}
      disabled={dragIsDisabled}
      fadeSourceWhileDragging
    >
      <div
        id={`record-calendar-card-${recordId}-${calendarDay}`}
        data-selectable-id={recordId}
        {...stylex.props(styles.draggableContainer)}
      >
        <RecordCalendarCard recordId={recordId} calendarDay={calendarDay} />
      </div>
    </DragDropItemSortableCell>
  );
};
