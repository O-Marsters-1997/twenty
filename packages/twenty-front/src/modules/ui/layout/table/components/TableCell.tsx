import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  cell: {
    padding: `0 ${spacing['--t-spacing-2']}`,
    overflow: 'visible',
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'inherit',
    display: 'flex',
    justifyContent: 'flex-start',
    textAlign: 'left',
    textOverflow: 'clip',
    whiteSpace: 'normal',
    height: spacing['--t-spacing-8'],
  },
  clickable: { cursor: 'pointer' },
  alignCenter: { justifyContent: 'center', textAlign: 'center' },
  alignRight: { justifyContent: 'flex-end', textAlign: 'right' },
  color: (color: string) => ({ color }),
  gap: (gap: string) => ({ gap }),
  height: (height: string) => ({ height }),
  maxWidth: (maxWidth: string) => ({ maxWidth }),
  minWidth: (minWidth: string) => ({ minWidth }),
  overflow: (overflow: string) => ({ overflow }),
  padding: (padding: string) => ({ padding }),
  textOverflow: (textOverflow: string) => ({ textOverflow }),
  whiteSpace: (whiteSpace: string) => ({ whiteSpace }),
});

type TableCellProps = Omit<ComponentProps<'div'>, 'color'> & {
  align?: 'left' | 'center' | 'right';
  color?: string;
  gap?: string;
  height?: string;
  maxWidth?: string;
  minWidth?: string;
  overflow?: string;
  padding?: string;
  textOverflow?: string;
  whiteSpace?: string;
  clickable?: boolean;
};

export const TableCell = ({
  align,
  color,
  gap,
  height,
  maxWidth,
  minWidth,
  overflow,
  padding,
  textOverflow,
  whiteSpace,
  clickable,
  className,
  ...props
}: TableCellProps) => {
  const cellProps = stylex.props(
    styles.cell,
    clickable === true && styles.clickable,
    align === 'center' && styles.alignCenter,
    align === 'right' && styles.alignRight,
    color !== undefined && color !== '' && styles.color(color),
    gap !== undefined && styles.gap(gap),
    height !== undefined && styles.height(height),
    maxWidth !== undefined && styles.maxWidth(maxWidth),
    minWidth !== undefined && styles.minWidth(minWidth),
    overflow !== undefined && styles.overflow(overflow),
    padding !== undefined && styles.padding(padding),
    textOverflow !== undefined && styles.textOverflow(textOverflow),
    whiteSpace !== undefined && styles.whiteSpace(whiteSpace),
  );

  return (
    <div
      {...props}
      {...cellProps}
      className={[cellProps.className, className].join(' ')}
    />
  );
};
