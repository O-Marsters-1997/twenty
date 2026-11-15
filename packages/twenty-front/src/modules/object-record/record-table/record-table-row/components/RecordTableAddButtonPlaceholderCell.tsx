import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { cx } from '@linaria/core';
import * as stylex from '@stylexjs/stylex';

export const RecordTableAddButtonPlaceholderCell = ({
  className,
}: {
  className?: string;
}) => {
  const stylexProps = stylex.props(styles.cell);

  return (
    <div {...stylexProps} className={cx(className, stylexProps.className)} />
  );
};

const styles = stylex.create({
  cell: {
    height: recordTableLayout.rowHeight,
    width: recordTableLayout.addColumnButtonWidth,
  },
});
