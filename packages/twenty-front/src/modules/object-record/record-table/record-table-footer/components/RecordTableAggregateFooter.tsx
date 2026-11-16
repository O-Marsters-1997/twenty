import * as stylex from '@stylexjs/stylex';

import {
  recordTableCssVariable,
  recordTableLayout,
  recordTableZIndex,
} from '../../constants/recordTableLayout.stylex';
import { RECORD_TABLE_COLUMN_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnLastEmptyColumnWidthClassName';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableAggregateFooterCell } from '@/object-record/record-table/record-table-footer/components/RecordTableAggregateFooterCell';
import { RecordTableColumnAggregateFooterCellContext } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterCellContext';
import { background } from 'twenty-ui/theme/tokens.stylex';
import { useIsMobile } from 'twenty-ui/utilities';

export const RecordTableAggregateFooter = ({
  currentRecordGroupId,
}: {
  currentRecordGroupId?: string;
}) => {
  const { visibleRecordFields } = useRecordTableContextOrThrow();
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <div {...stylex.props(styles.aggregateFooterContainer)}>
      <div {...stylex.props(styles.placeholderDragAndDropFooterCell)} />
      {visibleRecordFields.map((recordField, index) => {
        return (
          <RecordTableColumnAggregateFooterCellContext.Provider
            key={`${recordField.fieldMetadataItemId}${currentRecordGroupId ? '-' + currentRecordGroupId : ''}`}
            value={{
              viewFieldId: recordField.id || '',
              fieldMetadataId: recordField.fieldMetadataItemId,
            }}
          >
            <RecordTableAggregateFooterCell
              currentRecordGroupId={currentRecordGroupId}
              columnIndex={index}
            />
          </RecordTableColumnAggregateFooterCellContext.Provider>
        );
      })}
      <div {...stylex.props(styles.placeholderAddButtonFooterCell)} />
      <div
        {...mergeClassName(
          stylex.props(styles.placeholderLastColumnEmptyFooterCell),
          RECORD_TABLE_COLUMN_LAST_EMPTY_COLUMN_WIDTH_CLASS_NAME,
        )}
      />
    </div>
  );
};

const styles = stylex.create({
  placeholderDragAndDropFooterCell: {
    backgroundColor: background['--t-background-primary'],
    bottom: 0,
    left: 0,
    position: 'sticky',
    width: `calc(var(${recordTableCssVariable.dragDropWidth}) + var(${recordTableCssVariable.checkboxWidth}))`,
    zIndex: recordTableZIndex.footerStickyColumn,
  },
  placeholderAddButtonFooterCell: {
    backgroundColor: background['--t-background-primary'],
    bottom: 0,
    position: 'sticky',
    width: recordTableLayout.addColumnButtonWidth,
    zIndex: recordTableZIndex.footerDefault,
  },
  placeholderLastColumnEmptyFooterCell: {
    backgroundColor: background['--t-background-primary'],
    bottom: 0,
    position: 'sticky',
    zIndex: recordTableZIndex.footerDefault,
  },
  aggregateFooterContainer: {
    bottom: 0,
    display: 'flex',
    position: 'sticky',
    zIndex: recordTableZIndex.footerDefault,
  },
});
