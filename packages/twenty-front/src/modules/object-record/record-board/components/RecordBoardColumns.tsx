import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { RecordBoardColumn } from '@/object-record/record-board/record-board-column/components/RecordBoardColumn';
import { visibleRecordGroupIdsComponentFamilySelector } from '@/object-record/record-group/states/selectors/visibleRecordGroupIdsComponentFamilySelector';
import { canAddRecordGroupForFieldMetadataItem } from '@/object-record/record-group/utils/canAddRecordGroupForFieldMetadataItem';
import { useAtomComponentFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue';
import { ViewType } from '@/views/types/ViewType';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  columnContainer: {
    flex: '1',
    display: 'flex',
  },
  addGroupColumnDivider: {
    borderLeftColor: borderColor['--t-border-color-light'],
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    width: '0',
  },
});

export const RecordBoardColumns = () => {
  const { selectFieldMetadataItem } = useContext(RecordBoardContext);

  const visibleRecordGroupIds = useAtomComponentFamilySelectorValue(
    visibleRecordGroupIdsComponentFamilySelector,
    ViewType.KANBAN,
  );

  const shouldShowAddGroupColumnDivider = canAddRecordGroupForFieldMetadataItem(
    selectFieldMetadataItem,
  );

  return (
    <div {...stylex.props(styles.columnContainer)}>
      {visibleRecordGroupIds.map((recordGroupId, index) => {
        return (
          <RecordBoardColumn
            key={recordGroupId}
            recordBoardColumnId={recordGroupId}
            recordBoardColumnIndex={index}
          />
        );
      })}
      {shouldShowAddGroupColumnDivider && (
        <div {...stylex.props(styles.addGroupColumnDivider)} />
      )}
    </div>
  );
};
