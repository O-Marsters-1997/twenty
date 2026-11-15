import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';
import { media } from 'twenty-ui/theme/constants.stylex';
import { background, fontColor } from 'twenty-ui/theme/tokens.stylex';
import { useIsMobile } from 'twenty-ui/utilities';

import { RECORD_TABLE_CELL_CONTENT_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableCellContentClassName';
import {
  recordTableCssVariable,
  recordTableLayout,
  recordTableZIndex,
} from '../../constants/recordTableLayout.stylex';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableColumnAggregateFooterCellContext } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterCellContext';
import { RecordTableColumnAggregateFooterValue } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterValue';
import { RecordTableColumnFooterWithDropdown } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterWithDropdown';
import { hasAggregateOperationForViewFieldFamilySelector } from '@/object-record/record-table/record-table-footer/states/hasAggregateOperationForViewFieldFamilySelector';
import { isRecordTableColumnResizableComponentState } from '@/object-record/record-table/states/isRecordTableColumnResizableComponentState';
import { useIsRecordTableWidgetAggregateNonInteractive } from '@/object-record/record-table-widget/hooks/useIsRecordTableWidgetAggregateNonInteractive';
import { getRecordTableColumnFieldWidthClassName } from '@/object-record/record-table/utils/getRecordTableColumnFieldWidthClassName';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { cx } from '@linaria/core';
import { findByProperty, isDefined } from 'twenty-shared/utils';

export const RecordTableAggregateFooterCell = ({
  columnIndex,
  currentRecordGroupId,
}: {
  columnIndex: number;
  currentRecordGroupId?: string;
}) => {
  const { visibleRecordFields } = useRecordTableContextOrThrow();

  const { fieldMetadataId, viewFieldId } = useContext(
    RecordTableColumnAggregateFooterCellContext,
  );

  const hasAggregateOperationForViewField = useAtomFamilySelectorValue(
    hasAggregateOperationForViewFieldFamilySelector,
    { viewFieldId },
  );

  const isRecordTableColumnResizable = useAtomComponentStateValue(
    isRecordTableColumnResizableComponentState,
  );

  const isFooterReadOnly =
    useIsRecordTableWidgetAggregateNonInteractive() ??
    !isRecordTableColumnResizable;

  const recordField = visibleRecordFields.find(
    findByProperty('fieldMetadataItemId', fieldMetadataId),
  );

  const isFirstCell = columnIndex === 0;
  const isMobile = useIsMobile();

  if (!isDefined(recordField)) {
    return null;
  }

  const cellProps = stylex.props(
    styles.cell,
    isFooterReadOnly ? styles.readOnly : styles.interactive,
    isFirstCell ? styles.firstCell : styles.otherCell,
    !isMobile && styles.columnWidth(recordField.size + 1),
    isMobile &&
      (isFirstCell ? styles.mobileFirstCellWidth : styles.mobileOtherCellWidth),
  );
  const containerProps = stylex.props(styles.columnFootContainer);

  return (
    <div
      {...cellProps}
      className={cx(
        'footer-cell',
        getRecordTableColumnFieldWidthClassName(columnIndex),
        cellProps.className,
      )}
    >
      <div
        {...containerProps}
        className={cx(
          RECORD_TABLE_CELL_CONTENT_CLASS_NAME,
          containerProps.className,
        )}
      >
        {isFooterReadOnly ? (
          hasAggregateOperationForViewField ? (
            <RecordTableColumnAggregateFooterValue
              fieldMetadataId={fieldMetadataId}
              dropdownId={`${fieldMetadataId}-footer-readonly`}
            />
          ) : null
        ) : (
          <RecordTableColumnFooterWithDropdown
            currentRecordGroupId={currentRecordGroupId}
            isFirstCell={isFirstCell}
          />
        )}
      </div>
    </div>
  );
};

const firstColumnWidth = `var(--record-table-column-field-0)`;

const styles = stylex.create({
  cell: {
    backgroundColor: background['--t-background-primary'],
    borderRightColor: background['--t-background-primary'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    bottom: 0,
    color: fontColor['--t-font-color-tertiary'],
    height: recordTableLayout.rowHeight,
    overflow: 'hidden',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    position: 'sticky',
    textAlign: 'left',
  },
  readOnly: {
    cursor: 'default',
  },
  interactive: {
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': {
        default: null,
        [media.hoverCapable]: background['--t-background-secondary'],
      },
    },
    cursor: 'pointer',
  },
  firstCell: {
    left: `var(${recordTableCssVariable.firstColumnLeft})`,
    zIndex: recordTableZIndex.footerStickyColumn,
  },
  otherCell: {
    left: 'auto',
    zIndex: recordTableZIndex.footerDefault,
  },
  columnWidth: (columnWidth: number) => ({
    minWidth: columnWidth,
    width: columnWidth,
  }),
  mobileFirstCellWidth: {
    maxWidth: firstColumnWidth,
    minWidth: firstColumnWidth,
    width: firstColumnWidth,
  },
  mobileOtherCellWidth: {
    maxWidth: 'none',
    minWidth: 0,
    width: 'auto',
  },
  columnFootContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
});
