import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnDragAndDropWidthClassName';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableDragAndDropPlaceholderCell = () => (
  <div
    {...mergeClassName(
      stylex.props(styles.cell),
      RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME,
    )}
  />
);

const styles = stylex.create({
  cell: {
    overflow: 'hidden',
    backgroundColor: background['--t-background-primary'],
    position: 'sticky',
    borderBottomColor: background['--t-background-primary'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: recordTableLayout.rowHeight,
    left: 0,
  },
});
