import { useContext, useRef } from 'react';

import { RecordBoardColumnWidthEffect } from '@/object-record/record-board/components/RecordBoardColumnWidthEffect';
import { RecordBoardColumns } from '@/object-record/record-board/components/RecordBoardColumns';
import { RecordBoardDragSelect } from '@/object-record/record-board/components/RecordBoardDragSelect';
import { RecordBoardEffects } from '@/object-record/record-board/components/RecordBoardEffects';
import { RecordBoardFetchMoreInViewTriggerComponent } from '@/object-record/record-board/components/RecordBoardFetchMoreInViewTriggerComponent';
import { RecordBoardHeader } from '@/object-record/record-board/components/RecordBoardHeader';
import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { isRecordBoardViewSettingsReadOnlyComponentState } from '@/object-record/record-board/states/isRecordBoardViewSettingsReadOnlyComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';

import { getRecordBoardHtmlId } from '@/object-record/record-board/utils/getRecordBoardHtmlId';
import { RecordBoardDndKitProvider } from '@/object-record/record-board/record-board-dnd/providers/RecordBoardDndKitProvider';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minHeight: '100%',
  },
  containerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'min-content',
    minHeight: `calc(100% - ${spacing['--t-spacing-2']})`,
  },
  boardContentContainer: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
});

export const RecordBoard = () => {
  const { recordBoardId } = useContext(RecordBoardContext);
  const boardRef = useRef<HTMLDivElement>(null);

  const isRecordBoardViewSettingsReadOnly = useAtomComponentStateValue(
    isRecordBoardViewSettingsReadOnlyComponentState,
  );

  return (
    <>
      <ScrollWrapper
        componentInstanceId={`scroll-wrapper-record-board-${recordBoardId}`}
      >
        <RecordBoardEffects />
        <RecordBoardColumnWidthEffect />
        <div
          id={getRecordBoardHtmlId(recordBoardId)}
          {...stylex.props(styles.containerContainer)}
        >
          <RecordBoardHeader />
          <div {...stylex.props(styles.boardContentContainer)}>
            <div ref={boardRef} {...stylex.props(styles.container)}>
              <RecordBoardDndKitProvider>
                <RecordBoardColumns />
              </RecordBoardDndKitProvider>
              {!isRecordBoardViewSettingsReadOnly && (
                <RecordBoardDragSelect boardRef={boardRef} />
              )}
              <RecordBoardFetchMoreInViewTriggerComponent />
            </div>
          </div>
        </div>
      </ScrollWrapper>
    </>
  );
};
