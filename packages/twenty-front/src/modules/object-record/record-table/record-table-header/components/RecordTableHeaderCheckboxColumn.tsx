import * as stylex from '@stylexjs/stylex';
import { useLingui } from '@lingui/react/macro';

import { recordIndexAllRecordIdsComponentSelector } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnCheckboxWidthClassName';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useResetRecordSelection } from '@/object-record/record-selection/hooks/useResetRecordSelection';
import { useSelectAllRows } from '@/object-record/record-table/hooks/internal/useSelectAllRows';
import { isRecordTableInitialLoadingComponentState } from '@/object-record/record-table/states/isRecordTableInitialLoadingComponentState';
import { allRecordsSelectedStatusComponentSelector } from '@/object-record/record-selection/states/selectors/allRecordsSelectedStatusComponentSelector';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { cx } from '@linaria/core';
import { Checkbox } from 'twenty-ui/primitives/input';

export const RecordTableHeaderCheckboxColumn = () => {
  const { t } = useLingui();

  const allRowsSelectedStatus = useAtomComponentSelectorValue(
    allRecordsSelectedStatusComponentSelector,
  );

  const { selectAllRows } = useSelectAllRows();

  const { resetRecordSelection } = useResetRecordSelection();

  const checked =
    allRowsSelectedStatus === 'all' || allRowsSelectedStatus === 'some';
  const indeterminate = allRowsSelectedStatus === 'some';

  const { recordTableId } = useRecordTableContextOrThrow();

  const isRecordTableInitialLoading = useAtomComponentStateValue(
    isRecordTableInitialLoadingComponentState,
    recordTableId,
  );

  const allRecordIds = useAtomComponentSelectorValue(
    recordIndexAllRecordIdsComponentSelector,
    recordTableId,
  );

  const recordTableIsEmpty =
    !isRecordTableInitialLoading && allRecordIds.length === 0;

  const onChange = () => {
    if (checked) {
      resetRecordSelection();
    } else {
      selectAllRows();
    }
  };

  const columnHeaderCellProps = stylex.props(styles.columnHeaderCell);

  return (
    <div
      {...columnHeaderCellProps}
      className={cx(
        'header-cell',
        RECORD_TABLE_COLUMN_CHECKBOX_WIDTH_CLASS_NAME,
        columnHeaderCellProps.className,
      )}
    >
      <div {...stylex.props(styles.container)} data-select-disable>
        <Checkbox
          hoverable
          checked={checked}
          onCheckedChange={() => onChange()}
          indeterminate={indeterminate}
          disabled={recordTableIsEmpty}
          aria-label={t`Select all rows`}
        />
      </div>
    </div>
  );
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    display: 'flex',
    height: recordTableLayout.rowHeight,
    justifyContent: 'center',
    minWidth: 24,
    paddingRight: spacing['--t-spacing-1'],
  },
  columnHeaderCell: {
    backgroundColor: background['--t-background-primary'],
    cursor: 'pointer',
    maxHeight: recordTableLayout.rowHeight,
    minWidth: recordTableLayout.checkboxColumnWidth,
  },
});
