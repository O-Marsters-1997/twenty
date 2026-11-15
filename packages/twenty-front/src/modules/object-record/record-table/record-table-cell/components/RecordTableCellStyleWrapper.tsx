import { cx } from '@linaria/core';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  accent,
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

export const RecordTableCellStyleWrapper = ({
  children,
  isSelected,
  isDragging,
  hasRightBorder = true,
  hasBottomBorder = true,
  widthClassName,
  ...divProps
}: {
  className?: string;
  children?: ReactNode;
  isSelected?: boolean;
  isDragging?: boolean;
  hasRightBorder?: boolean;
  hasBottomBorder?: boolean;
  widthClassName: string;
} & React.ComponentProps<'div'>) => {
  const stylexProps = stylex.props(
    styles.cell,
    isSelected && styles.selected,
    !hasRightBorder && styles.withoutRightBorder,
    !hasBottomBorder && styles.withoutBottomBorder,
    isDragging && styles.dragging,
  );

  return (
    <div
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...divProps}
      {...stylexProps}
      className={cx('table-cell', widthClassName, stylexProps.className)}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderRightColor: borderColor['--t-border-color-light'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    color: fontColor['--t-font-color-primary'],
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    textAlign: 'left',
  },
  selected: {
    backgroundColor: accent['--t-accent-quaternary'],
  },
  withoutRightBorder: {
    borderRightStyle: 'none',
  },
  withoutBottomBorder: {
    borderBottomColor: 'transparent',
  },
  dragging: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
