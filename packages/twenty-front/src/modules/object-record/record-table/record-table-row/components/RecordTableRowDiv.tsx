import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithRef } from 'react';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

import './RecordTableRowDiv.css';

type RecordTableRowDivProps = ComponentPropsWithRef<'div'> & {
  isDragging: boolean;
  xstyle?: stylex.StyleXStyles;
};

export const RecordTableRowDiv = ({
  isDragging,
  xstyle,
  className,
  ...divProps
}: RecordTableRowDivProps) => (
  <div
    {...divProps}
    {...mergeClassName(
      stylex.props(styles.row, isDragging && styles.dragging, xstyle),
      className ? `record-table-row-div ${className}` : 'record-table-row-div',
    )}
  />
);

const styles = stylex.create({
  row: {
    borderBottomStyle: 'none',
    borderTopStyle: 'none',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  },
  dragging: {
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  },
});
