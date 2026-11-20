import { Fragment } from 'react';

import { RecordBoardColumnNewRecordButton } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnNewRecordButton';
import { RecordBoardColumnLoadingSkeletonCards } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnLoadingSkeletonCards';
import { recordBoardShouldFetchMoreInColumnComponentFamilyState } from '@/object-record/record-board/states/recordBoardShouldFetchMoreInColumnComponentFamilyState';
import { recordIndexRecordIdsByGroupComponentFamilyState } from '@/object-record/record-index/states/recordIndexRecordIdsByGroupComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import { RecordBoardCardContextProvider } from '@/object-record/record-board/record-board-card/components/RecordBoardCardContextProvider';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  columnCardsContainer: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
  newButtonContainer: {
    paddingBottom: spacing['--t-spacing-4'],
  },
});

type RecordBoardColumnCardsContainerProps = {
  recordBoardColumnId: string;
};

export const RecordBoardColumnCardsContainer = ({
  recordBoardColumnId,
}: RecordBoardColumnCardsContainerProps) => {
  const recordIndexRecordIdsByGroup = useAtomComponentFamilyStateValue(
    recordIndexRecordIdsByGroupComponentFamilyState,
    recordBoardColumnId,
  );

  const recordBoardShouldFetchMoreInColumn = useAtomComponentFamilyStateValue(
    recordBoardShouldFetchMoreInColumnComponentFamilyState,
    recordBoardColumnId,
  );

  return (
    <div
      data-replay-ignore-mutations="true"
      {...stylex.props(styles.columnCardsContainer)}
    >
      {recordIndexRecordIdsByGroup.map((recordId, index) => (
        <Fragment key={recordId}>
          <DragDropItemDropTarget
            index={index}
            droppableId={recordBoardColumnId}
            orientation="horizontal"
            compact
          />
          <RecordBoardCardContextProvider
            recordId={recordId}
            rowIndex={index}
            group={recordBoardColumnId}
          />
        </Fragment>
      ))}
      {recordBoardShouldFetchMoreInColumn ? (
        <RecordBoardColumnLoadingSkeletonCards />
      ) : null}
      <DragDropItemDropTarget
        index={recordIndexRecordIdsByGroup.length}
        droppableId={recordBoardColumnId}
        orientation="horizontal"
        compact
      />
      <div {...stylex.props(styles.newButtonContainer)}>
        <RecordBoardColumnNewRecordButton />
      </div>
    </div>
  );
};
