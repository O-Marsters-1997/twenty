import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnDragAndDropWidthClassName';
import { cx } from '@linaria/core';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableDragAndDropPlaceholderCell = ({
  className,
}: {
  className?: string;
}) => {
  const stylexProps = stylex.props(styles.cell);

  return (
    <div
      {...stylexProps}
      className={cx(
        RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH_CLASS_NAME,
        className,
        stylexProps.className,
      )}
    />
  );
};

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    borderBottomColor: background['--t-background-primary'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: recordTableLayout.rowHeight,
    left: 0,
    overflow: 'hidden',
    position: 'sticky',
  },
});
