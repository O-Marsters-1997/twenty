import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnWithGroupLastEmptyColumnWidthClassName';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';

export const RecordTableGroupSectionLastDynamicFillingCell = ({
  xstyle,
}: {
  xstyle?: stylex.StyleXStyles;
}) => (
  <div
    {...mergeClassName(
      stylex.props(styles.cell, xstyle),
      RECORD_TABLE_COLUMN_WITH_GROUP_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME,
    )}
  />
);

const styles = stylex.create({
  cell: {
    height: recordTableLayout.rowHeight,
  },
});
