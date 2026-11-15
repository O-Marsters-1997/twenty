import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnWithGroupLastEmptyColumnWidthClassName';
import { cx } from '@linaria/core';
import * as stylex from '@stylexjs/stylex';

export const RecordTableGroupSectionLastDynamicFillingCell = ({
  className,
}: {
  className?: string;
}) => {
  const stylexProps = stylex.props(styles.cell);

  return (
    <div
      {...stylexProps}
      className={cx(
        RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME,
        className,
        stylexProps.className,
      )}
    />
  );
};

const styles = stylex.create({
  cell: {
    height: recordTableLayout.rowHeight,
  },
});
