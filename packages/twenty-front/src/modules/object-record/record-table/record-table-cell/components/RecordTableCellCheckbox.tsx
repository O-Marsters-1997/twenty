import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { useCallback } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnCheckboxWidthClassName';
import { useRecordTableRowContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowContext';
import { useRecordTableRowDraggableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableRowDraggableContext';
import { useToggleRecordSelection } from '@/object-record/record-selection/hooks/useToggleRecordSelection';
import { RecordTableCellStyleWrapper } from '@/object-record/record-table/record-table-cell/components/RecordTableCellStyleWrapper';
import { Checkbox } from 'twenty-ui/primitives/input';

export const RecordTableCellCheckbox = () => {
  const { t } = useLingui();

  const { isSelected, recordId } = useRecordTableRowContextOrThrow();
  const { isDragging } = useRecordTableRowDraggableContextOrThrow();

  const { toggleRecordSelection } = useToggleRecordSelection();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      toggleRecordSelection({
        recordId,
        shouldSelectRange: event.shiftKey,
      });
    },
    [recordId, toggleRecordSelection],
  );

  return (
    <RecordTableCellStyleWrapper
      isSelected={isSelected}
      isDragging={isDragging}
      hasRightBorder={false}
      widthClassName={RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME}
    >
      <div
        {...stylex.props(styles.container)}
        onClick={handleClick}
        data-select-disable
      >
        <Checkbox hoverable checked={isSelected} aria-label={t`Select row`} />
      </div>
    </RecordTableCellStyleWrapper>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    height: recordTableLayout.rowHeight,
    minWidth: recordTableLayout.checkboxColumnWidth,
    paddingRight: spacing['--t-spacing-1'],
    width: recordTableLayout.checkboxColumnWidth,
  },
});
