import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnCheckboxWidthClassName';
import { useRecordTableBodyContextOrThrow } from '@/object-record/record-table/contexts/RecordTableBodyContext';
import { RecordTableCellStyleWrapper } from '@/object-record/record-table/record-table-cell/components/RecordTableCellStyleWrapper';
import { Checkbox } from 'twenty-ui/primitives/input';

export const RecordTableCellCheckboxPlaceholder = () => {
  const { hasUserSelectedAllRecords } = useRecordTableBodyContextOrThrow();

  return (
    <RecordTableCellStyleWrapper
      isSelected={hasUserSelectedAllRecords}
      hasRightBorder={false}
      widthClassName={RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME}
    >
      <div {...stylex.props(styles.container)} data-select-disable>
        <Checkbox hoverable checked={hasUserSelectedAllRecords === true} />
      </div>
    </RecordTableCellStyleWrapper>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    justifyContent: 'center',
    minWidth: recordTableLayout.checkboxColumnWidth,
    paddingRight: spacing['--t-spacing-1'],
    width: recordTableLayout.checkboxColumnWidth,
  },
});
