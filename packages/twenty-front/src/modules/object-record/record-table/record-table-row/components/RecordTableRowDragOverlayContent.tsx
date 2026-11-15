import { type Draggable } from '@dnd-kit/dom';
import * as stylex from '@stylexjs/stylex';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { background } from 'twenty-ui/theme/tokens.stylex';

import { getRecordTableColumnWidthInlineStyles } from '@/object-record/record-table/components/RecordTableStyleWrapper';
import { RECORD_TABLE_COLUMN_LAST_EMPTY_COLUMN_WIDTH_VARIABLE_NAME } from '@/object-record/record-table/constants/RecordTableColumnLastEmptyColumnWidthVariableName';
import { RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_VARIABLE_NAME } from '@/object-record/record-table/constants/RecordTableColumnWithGroupLastEmptyColumnWidthVariableName';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableRowDraggableContextProvider } from '@/object-record/record-table/contexts/RecordTableRowDraggableContext';
import { useIsRecordTableCheckboxColumnHidden } from '@/object-record/record-table/hooks/useIsRecordTableCheckboxColumnHidden';
import { useRecordTableLastColumnWidthToFill } from '@/object-record/record-table/hooks/useRecordTableLastColumnWidthToFill';
import { isRecordTableDragColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableDragColumnHiddenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { RecordTableCellCheckbox } from '@/object-record/record-table/record-table-cell/components/RecordTableCellCheckbox';
import { RecordTableCellDragAndDrop } from '@/object-record/record-table/record-table-cell/components/RecordTableCellDragAndDrop';
import { RecordTableLastEmptyCell } from '@/object-record/record-table/record-table-cell/components/RecordTableLastEmptyCell';
import { RecordTablePlusButtonCellPlaceholder } from '@/object-record/record-table/record-table-cell/components/RecordTablePlusButtonCellPlaceholder';
import { RecordTableFieldsCells } from '@/object-record/record-table/record-table-row/components/RecordTableFieldsCells';
import { RecordDragMultiDragCounterChip } from '@/object-record/record-drag/components/RecordDragMultiDragCounterChip';
import { RecordTableTr } from '@/object-record/record-table/record-table-row/components/RecordTableTr';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { type RecordTableRowDragData } from '@/object-record/record-table/types/RecordTableRowDragData';
import { useScrollWrapperHTMLElement } from '@/ui/utilities/scroll/hooks/useScrollWrapperHTMLElement';

import '@/object-record/record-table/components/RecordTableStyleWrapper.css';

export const RecordTableRowDragOverlayContent = ({
  source,
}: {
  source: Draggable | null;
}) => {
  const { lastColumnWidth } = useRecordTableLastColumnWidthToFill();

  const { visibleRecordFields } = useRecordTableContextOrThrow();

  const isRecordTableDragColumnHidden = useAtomComponentStateValue(
    isRecordTableDragColumnHiddenComponentState,
  );

  const isRecordTableCheckboxColumnHidden =
    useIsRecordTableCheckboxColumnHidden();

  const { scrollWrapperHTMLElement } = useScrollWrapperHTMLElement();

  const visibleTableWidth = scrollWrapperHTMLElement?.clientWidth;

  const columnWidthStyles = useMemo(() => {
    const widthStyles: Record<string, string> =
      getRecordTableColumnWidthInlineStyles({
        visibleRecordFields,
        isDragColumnHidden: isRecordTableDragColumnHidden,
        isCheckboxColumnHidden: isRecordTableCheckboxColumnHidden,
      });
    widthStyles[RECORD_TABLE_COLUMN_LAST_EMPTY_COLUMN_WIDTH_VARIABLE_NAME] =
      `${lastColumnWidth}px`;
    widthStyles[
      RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_VARIABLE_NAME
    ] = `${lastColumnWidth}px`;
    return widthStyles;
  }, [
    visibleRecordFields,
    lastColumnWidth,
    isRecordTableDragColumnHidden,
    isRecordTableCheckboxColumnHidden,
  ]);

  const sourceData = source?.data as RecordTableRowDragData | undefined;

  if (!isDefined(source) || !isDefined(sourceData)) {
    return null;
  }

  const recordId = sourceData.recordId;

  return (
    <div
      {...mergeClassName(
        stylex.props(styles.bridge),
        'record-table-drag-overlay',
      )}
      style={columnWidthStyles}
    >
      <div
        {...stylex.props(
          styles.clipContainer,
          isDefined(visibleTableWidth) &&
            styles.clipContainerMaxWidth(visibleTableWidth),
        )}
      >
        <RecordTableTr
          recordId={recordId}
          focusIndex={sourceData.focusIndex}
          xstyle={styles.draggedRow}
          isDragging
          data-testid={`row-id-${recordId}`}
          data-selectable-id={recordId}
          onClick={() => {}}
        >
          <RecordTableRowDraggableContextProvider value={{ isDragging: true }}>
            {!isRecordTableDragColumnHidden && <RecordTableCellDragAndDrop />}
            {!isRecordTableCheckboxColumnHidden && <RecordTableCellCheckbox />}
            <RecordTableFieldsCells />
            <RecordTablePlusButtonCellPlaceholder />
            <RecordTableLastEmptyCell />
          </RecordTableRowDraggableContextProvider>
        </RecordTableTr>
      </div>
      <RecordDragMultiDragCounterChip />
    </div>
  );
};

const styles = stylex.create({
  bridge: {
    position: 'relative',
  },
  clipContainer: {
    overflow: 'hidden',
  },
  clipContainerMaxWidth: (maxWidth: number) => ({ maxWidth }),
  draggedRow: {
    backgroundColor: background['--t-background-secondary'],
  },
});
