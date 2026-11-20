import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { RECORD_TABLE_COLUMN_ADD_COLUMN_BUTTON_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnAddColumnButtonWidthClassName';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { isRecordTableRowActiveComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowActiveComponentFamilyState';
import { isRecordTableRowFocusActiveComponentState } from '@/object-record/record-table/states/isRecordTableRowFocusActiveComponentState';
import { isRecordTableRowFocusedComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowFocusedComponentFamilyState';
import { isRecordTableScrolledVerticallyComponentState } from '@/object-record/record-table/states/isRecordTableScrolledVerticallyComponentState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor } from 'twenty-ui/theme/tokens.stylex';

export const RecordTableHeaderEmptyLastColumn = () => {
  const isRecordTableRowActive = useAtomComponentFamilyStateValue(
    isRecordTableRowActiveComponentFamilyState,
    0,
  );

  const isRecordTableRowFocused = useAtomComponentFamilyStateValue(
    isRecordTableRowFocusedComponentFamilyState,
    0,
  );

  const isRecordTableRowFocusActive = useAtomComponentStateValue(
    isRecordTableRowFocusActiveComponentState,
  );

  const isFirstRowActiveOrFocused =
    isRecordTableRowActive ||
    (isRecordTableRowFocused && isRecordTableRowFocusActive);

  const isRecordTableScrolledVertically = useAtomComponentStateValue(
    isRecordTableScrolledVerticallyComponentState,
  );

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
  );

  const shouldDisplayBorderBottom =
    hasRecordGroups ||
    !isFirstRowActiveOrFocused ||
    isRecordTableScrolledVertically;

  const cellProps = stylex.props(
    styles.cell,
    shouldDisplayBorderBottom && styles.borderBottom,
  );

  return (
    <div
      {...mergeClassName(
        cellProps,
        `header-cell ${RECORD_TABLE_COLUMN_ADD_COLUMN_BUTTON_WIDTH_CLASS_NAME}`,
      )}
    />
  );
};

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    zIndex: 1,
    height: recordTableLayout.rowHeight,
    maxHeight: recordTableLayout.rowHeight,
    width: recordTableLayout.addColumnButtonWidth,
  },
  borderBottom: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
});
