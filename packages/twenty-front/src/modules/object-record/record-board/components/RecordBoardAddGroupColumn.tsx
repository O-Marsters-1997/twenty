import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { isRecordBoardViewSettingsReadOnlyComponentState } from '@/object-record/record-board/states/isRecordBoardViewSettingsReadOnlyComponentState';
import { AddRecordGroupButton } from '@/object-record/record-group/components/AddRecordGroupButton';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { canAddRecordGroupForFieldMetadataItem } from '@/object-record/record-group/utils/canAddRecordGroupForFieldMetadataItem';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useContext } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const RECORD_BOARD_ADD_GROUP_DROPDOWN_ID = 'record-board-add-group-dropdown';

const styles = stylex.create({
  column: {
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
});

export const RecordBoardAddGroupColumn = () => {
  const { recordIndexId } = useRecordIndexContextOrThrow();
  const { selectFieldMetadataItem } = useContext(RecordBoardContext);

  const isRecordBoardViewSettingsReadOnly = useAtomComponentStateValue(
    isRecordBoardViewSettingsReadOnlyComponentState,
  );

  if (isRecordBoardViewSettingsReadOnly) {
    return null;
  }

  if (!canAddRecordGroupForFieldMetadataItem(selectFieldMetadataItem)) {
    return null;
  }

  return (
    <div {...stylex.props(styles.column)}>
      <AddRecordGroupButton
        fieldMetadataItem={selectFieldMetadataItem}
        dropdownId={`${RECORD_BOARD_ADD_GROUP_DROPDOWN_ID}-${recordIndexId}`}
        dropdownOffset={{ x: 0, y: 10 }}
      />
    </div>
  );
};
