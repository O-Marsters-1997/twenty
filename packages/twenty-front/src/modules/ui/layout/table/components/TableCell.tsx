import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  cell: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'inherit',
    display: 'flex',
    height: spacing['--t-spacing-8'],
    justifyContent: 'flex-start',
    overflow: 'visible',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textAlign: 'left',
    textOverflow: 'clip',
    whiteSpace: 'normal',
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

type TableCellProps = {
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
  children?: ReactNode;
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
  children,
}: TableCellProps) => (
  <div
    {...stylex.props(
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
    )}
  >
    {children}
  </div>
);
