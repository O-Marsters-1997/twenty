import { recordTableZIndex } from '../../constants/recordTableLayout.stylex';
import { getRecordTableColumnFieldWidthClassName } from '@/object-record/record-table/utils/getRecordTableColumnFieldWidthClassName';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  accent,
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

export const RecordTableCellFirstRowFirstColumn = ({
  children,
  isSelected,
  isDragging,
  hasRightBorder = true,
  hasBottomBorder = true,
}: {
  children?: ReactNode;
  isSelected?: boolean;
  isDragging?: boolean;
  hasRightBorder?: boolean;
  hasBottomBorder?: boolean;
}) => {
  const stylexProps = stylex.props(
    styles.cell,
    isSelected && styles.selected,
    hasRightBorder && styles.rightBorder,
    hasBottomBorder && !isDragging && styles.bottomBorder,
    isDragging && styles.dragging,
  );

  return (
    <div
      {...mergeClassName(
        stylexProps,
        `table-cell-0-0 ${getRecordTableColumnFieldWidthClassName(0)}`,
      )}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    color: fontColor['--t-font-color-primary'],
    textAlign: 'left',
    zIndex: recordTableZIndex.cellSticky,
    borderBottomColor: 'transparent',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderRightStyle: 'none',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  },
  selected: {
    backgroundColor: accent['--t-accent-quaternary'],
  },
  rightBorder: {
    borderRightColor: borderColor['--t-border-color-light'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
  },
  bottomBorder: {
    borderBottomColor: borderColor['--t-border-color-light'],
  },
  dragging: {
    backgroundColor: 'transparent',
  },
});
