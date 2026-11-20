import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { RecordBoardColumnCardsContainer } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnCardsContainer';
import { RecordBoardColumnContext } from '@/object-record/record-board/record-board-column/contexts/RecordBoardColumnContext';
import { useShouldHideRecordGroup } from '@/object-record/record-group/hooks/useShouldHideRecordGroup';
import { recordGroupDefinitionFamilyState } from '@/object-record/record-group/states/recordGroupDefinitionFamilyState';
import { recordIndexRecordIdsByGroupComponentFamilyState } from '@/object-record/record-index/states/recordIndexRecordIdsByGroupComponentFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';
import { useDroppable } from '@dnd-kit/react';
import { pointerIntersection } from '@dnd-kit/collision';
import { RECORD_BOARD_CARD_DND_TYPE } from '@/object-record/record-board/record-board-dnd/constants/RecordBoardCardDndType';
import { RECORD_BOARD_COLUMN_DND_TYPE } from '@/object-record/record-board/record-board-dnd/constants/RecordBoardColumnDndType';
import { DND_KIT_COLLISION_PRIORITY } from '@/ui/utilities/drag-and-drop/constants/DndKitCollisionPriority';

const styles = stylex.create({
  column: {
    paddingInline: spacing['--t-spacing-2'],
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    maxWidth: 'var(--record-board-column-width, 200px)',
    minWidth: 'var(--record-board-column-width, 200px)',
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: '0px',
  },
  withLeftBorder: {
    borderLeftColor: borderColor['--t-border-color-light'],
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
  },
});

type RecordBoardColumnProps = {
  recordBoardColumnId: string;
  recordBoardColumnIndex: number;
};

export const RecordBoardColumn = ({
  recordBoardColumnId,
  recordBoardColumnIndex,
}: RecordBoardColumnProps) => {
  const recordGroupDefinition = useAtomFamilyStateValue(
    recordGroupDefinitionFamilyState,
    recordBoardColumnId,
  );
  const recordIndexRecordIdsByGroup = useAtomComponentFamilyStateValue(
    recordIndexRecordIdsByGroupComponentFamilyState,
    recordBoardColumnId,
  );

  const shouldHide = useShouldHideRecordGroup(recordBoardColumnId);

  const { ref } = useDroppable({
    id: recordBoardColumnId,
    collisionPriority: DND_KIT_COLLISION_PRIORITY,
    collisionDetector: pointerIntersection,
    type: RECORD_BOARD_COLUMN_DND_TYPE,
    accept: RECORD_BOARD_CARD_DND_TYPE,
  });

  if (shouldHide) {
    return null;
  }

  if (!isDefined(recordGroupDefinition)) {
    return null;
  }

  return (
    <RecordBoardColumnContext.Provider
      value={{
        columnDefinition: recordGroupDefinition,
        columnId: recordBoardColumnId,
        recordIds: recordIndexRecordIdsByGroup,
        columnIndex: recordBoardColumnIndex,
      }}
    >
      <div
        ref={ref}
        data-record-board-column-id={recordBoardColumnId}
        {...stylex.props(
          styles.column,
          recordBoardColumnIndex > 0 && styles.withLeftBorder,
        )}
      >
        <RecordBoardColumnCardsContainer
          recordBoardColumnId={recordBoardColumnId}
        />
      </div>
    </RecordBoardColumnContext.Provider>
  );
};
