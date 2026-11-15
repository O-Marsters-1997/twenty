import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import * as stylex from '@stylexjs/stylex';

export const RecordTableAddButtonPlaceholderCell = ({
  xstyle,
}: {
  xstyle?: stylex.StyleXStyles;
}) => <div {...stylex.props(styles.cell, xstyle)} />;

const styles = stylex.create({
  cell: {
    height: recordTableLayout.rowHeight,
    width: recordTableLayout.addColumnButtonWidth,
  },
});
