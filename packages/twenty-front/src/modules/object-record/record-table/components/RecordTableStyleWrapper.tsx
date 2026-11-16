import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH } from '@/object-record/record-table/constants/RecordTableColumnCheckboxWidth';
import { RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH } from '@/object-record/record-table/constants/RecordTableColumnDragAndDropWidth';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithRef } from 'react';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { recordTableCssVariable } from '../constants/recordTableLayout.stylex';

import './RecordTableStyleWrapper.css';

export const RECORD_TABLE_DRAG_DROP_WIDTH_CSS_VAR =
  recordTableCssVariable.dragDropWidth;
export const RECORD_TABLE_CHECKBOX_WIDTH_CSS_VAR =
  recordTableCssVariable.checkboxWidth;
export const RECORD_TABLE_FIRST_COLUMN_LEFT_CSS_VAR =
  recordTableCssVariable.firstColumnLeft;

export const getRecordTableColumnWidthInlineStyles = ({
  visibleRecordFields,
  isDragColumnHidden,
  isCheckboxColumnHidden,
}: {
  visibleRecordFields: RecordField[];
  isDragColumnHidden?: boolean;
  isCheckboxColumnHidden?: boolean;
}): Record<string, string> => {
  const style: Record<string, string> = {};

  for (let i = 0; i < visibleRecordFields.length; i++) {
    style[`--record-table-column-field-${i}`] =
      `${visibleRecordFields[i].size}px`;
  }

  style[RECORD_TABLE_DRAG_DROP_WIDTH_CSS_VAR] = isDragColumnHidden
    ? '0px'
    : `${RECORD_TABLE_COLUMN_DRAG_AND_DROP_WIDTH}px`;

  style[RECORD_TABLE_CHECKBOX_WIDTH_CSS_VAR] = isCheckboxColumnHidden
    ? '0px'
    : `${RECORD_TABLE_COLUMN_CHECKBOX_WIDTH}px`;

  return style;
};

type RecordTableStyleWrapperProps = ComponentPropsWithRef<'div'> & {
  isDragging?: boolean;
};

export const RecordTableStyleWrapper = ({
  isDragging,
  className,
  style,
  ...divProps
}: RecordTableStyleWrapperProps) => (
  <div
    {...divProps}
    {...mergeClassName(
      stylex.props(styles.table),
      className
        ? `record-table-style-wrapper ${className}`
        : 'record-table-style-wrapper',
    )}
    data-is-dragging={isDragging === true}
    style={style}
  />
);

const styles = stylex.create({
  table: {
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: {
      default: null,
      [media.mobile]: spacing['--t-spacing-20'],
    },
    position: 'relative',
    width: '100%',
  },
});
