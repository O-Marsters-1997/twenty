import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import {
  recordTableGripMarker,
  recordTableLayout,
  recordTableZIndex,
} from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnDragAndDropWidthClassName';
import { useRecordTableRowDraggableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowDraggableContext';
import { RecordTableCellStyleWrapper } from '@/object-record/record-table/record-table-cell/components/RecordTableCellStyleWrapper';
import { IconListViewGrip } from '@/object-record/record-table/record-table-cell/components/internal/IconListViewGrip/IconListViewGrip';
import { DragDropItemSortableHandleRefContext } from '@/ui/utilities/drag-and-drop/context/DragDropItemSortableHandleRefContext';
import { media } from 'twenty-ui/theme/constants.stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableCellDragAndDrop = () => {
  const { isDragging } = useRecordTableRowDraggableContextOrThrow();

  const sortableHandleRef = useContext(DragDropItemSortableHandleRefContext);

  return (
    <RecordTableCellStyleWrapper
      data-select-disable
      isDragging={isDragging}
      hasRightBorder={false}
      hasBottomBorder={false}
      widthClassName={RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME}
    >
      <div
        ref={sortableHandleRef}
        {...stylex.props(styles.container, recordTableGripMarker)}
      >
        <div
          {...stylex.props(styles.iconWrapper, isDragging && styles.dragging)}
        >
          <IconListViewGrip />
        </div>
      </div>
    </RecordTableCellStyleWrapper>
  );
};

const styles = stylex.create({
  container: {
    cursor: 'grab',
    display: 'flex',
    zIndex: recordTableZIndex.columnGrip,
    height: recordTableLayout.rowHeight,
  },
  iconWrapper: {
    color: borderColor['--t-border-color-strong'],
    opacity: {
      default: 0,
      [media.hoverCapable]: {
        default: 0,
        [stylex.when.ancestor(':hover', recordTableGripMarker)]: 1,
      },
    },
    transitionDuration: '0.1s',
    transitionProperty: 'opacity',
  },
  dragging: {
    opacity: 1,
  },
});
