import { FieldDescriptionTooltipProvider } from '@/object-record/record-field/ui/components/FieldDescriptionTooltipProvider';
import {
  recordTableLayout,
  recordTableZIndex,
} from '../../constants/recordTableLayout.stylex';
import { RecordTableHeaderCheckboxColumn } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderCheckboxColumn';
import { RecordTableHeaderDnd } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderDnd';
import { RecordTableHeaderDragDropColumn } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderDragDropColumn';
import { RecordTableHeaderFirstCell } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderFirstCell';
import { useResizeTableHeader } from '@/object-record/record-table/record-table-header/hooks/useResizeTableHeader';
import { useIsRecordTableCheckboxColumnHidden } from '@/object-record/record-table/hooks/useIsRecordTableCheckboxColumnHidden';
import { isRecordTableDragColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableDragColumnHiddenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableHeader = () => {
  const isRecordTableDragColumnHidden = useAtomComponentStateValue(
    isRecordTableDragColumnHiddenComponentState,
  );

  const isRecordTableCheckboxColumnHidden =
    useIsRecordTableCheckboxColumnHidden();

  useResizeTableHeader();

  return (
    <FieldDescriptionTooltipProvider>
      <div {...stylex.props(styles.headerContainer)}>
        {!isRecordTableDragColumnHidden && <RecordTableHeaderDragDropColumn />}
        {!isRecordTableCheckboxColumnHidden && (
          <RecordTableHeaderCheckboxColumn />
        )}
        <RecordTableHeaderFirstCell />
        <RecordTableHeaderDnd />
      </div>
    </FieldDescriptionTooltipProvider>
  );
};

// Takes the first slot of the virtualized row grid, pitched one pixel taller than a row for its bottom border.
const styles = stylex.create({
  headerContainer: {
    backgroundColor: background['--t-background-primary'],
    boxShadow: `0 -1px 0 ${background['--t-background-primary']}`,
    display: 'flex',
    flexDirection: 'row',
    height: recordTableLayout.rowHeight + 1,
    position: 'sticky',
    top: 0,
    zIndex: recordTableZIndex.headerRow,
  },
});
