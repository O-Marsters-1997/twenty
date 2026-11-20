import { AddRecordGroupButton } from '@/object-record/record-group/components/AddRecordGroupButton';
import { canAddRecordGroupForFieldMetadataItem } from '@/object-record/record-group/utils/canAddRecordGroupForFieldMetadataItem';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const RECORD_TABLE_ADD_GROUP_DROPDOWN_ID = 'record-table-add-group-dropdown';

const styles = stylex.create({
  container: {
    display: 'flex',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const RecordTableRecordGroupAddNewGroup = () => {
  const { recordIndexId } = useRecordIndexContextOrThrow();
  const recordIndexGroupFieldMetadataItem = useAtomComponentStateValue(
    recordIndexGroupFieldMetadataItemComponentState,
  );

  const isRecordTableCellsNonEditable = useAtomComponentStateValue(
    isRecordTableCellsNonEditableComponentState,
  );

  if (isRecordTableCellsNonEditable) {
    return null;
  }

  if (
    !canAddRecordGroupForFieldMetadataItem(recordIndexGroupFieldMetadataItem)
  ) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <AddRecordGroupButton
        fieldMetadataItem={recordIndexGroupFieldMetadataItem}
        dropdownId={`${RECORD_TABLE_ADD_GROUP_DROPDOWN_ID}-${recordIndexId}`}
      />
    </div>
  );
};
