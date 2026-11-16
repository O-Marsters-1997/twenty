import { useSortable } from '@dnd-kit/react/sortable';

import { isRecordIdSecondaryDragMultipleComponentFamilyState } from '@/object-record/record-drag/states/isRecordIdSecondaryDragMultipleComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { type RecordDragData } from '@/object-record/record-drag/types/RecordDragData';
import { RecordListRow } from '@/object-record/record-list/components/RecordListRow';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { RECORD_LIST_ROW_DND_TYPE } from '@/object-record/record-list/constants/RecordListRowDndType';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import { DND_KIT_PLUGINS_WITHOUT_OPTIMISTIC } from '@/ui/utilities/drag-and-drop/constants/DndKitPluginsWithoutOptimistic';
import { preventNativeDragStart } from '@/ui/utilities/drag-and-drop/utils/preventNativeDragStart';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  draggableRow: {
    opacity: 1,
    position: 'relative',
  },
  dragSourceFaded: {
    opacity: 'var(--dnd-drag-source-opacity)',
  },
  rowDropTargetSlot: {
    left: '0',
    position: 'absolute',
    right: '0',
    top: '-1px',
  },
});

type RecordListDraggableRowProps = {
  recordId: string;
  index: number;
  droppableId: string;
};

export const RecordListDraggableRow = ({
  recordId,
  index,
  droppableId,
}: RecordListDraggableRowProps) => {
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );
  const isRecordIdSecondaryDragMultiple = useAtomComponentFamilyStateValue(
    isRecordIdSecondaryDragMultipleComponentFamilyState,
    { recordId },
  );

  const rowDragData: RecordDragData = {
    droppableId,
    index,
    recordId,
  };

  const { ref, isDragSource } = useSortable({
    id: recordId,
    index,
    group: droppableId,
    type: RECORD_LIST_ROW_DND_TYPE,
    accept: RECORD_LIST_ROW_DND_TYPE,
    data: rowDragData,
    disabled: !objectPermissions.canUpdateObjectRecords,
    transition: null,
    plugins: DND_KIT_PLUGINS_WITHOUT_OPTIMISTIC,
    feedback: 'clone',
  });

  return (
    <div
      onDragStart={preventNativeDragStart}
      {...stylex.props(
        styles.draggableRow,
        (isDragSource || isRecordIdSecondaryDragMultiple) &&
          styles.dragSourceFaded,
      )}
    >
      <RecordListRow recordId={recordId} rowRef={ref} />
      {!isDragSource && (
        <div {...stylex.props(styles.rowDropTargetSlot)}>
          <DragDropItemDropTarget
            index={index}
            droppableId={droppableId}
            orientation="horizontal"
            compact
            seamAligned
          />
        </div>
      )}
    </div>
  );
};
