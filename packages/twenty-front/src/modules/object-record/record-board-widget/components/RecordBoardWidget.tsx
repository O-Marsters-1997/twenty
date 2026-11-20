import { RecordBoardContainer } from '@/object-record/record-board/components/RecordBoardContainer';
import { RecordBoardWidgetStatesEffect } from '@/object-record/record-board-widget/components/RecordBoardWidgetStatesEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  boardContainer: {
    flex: '1',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
  },
});

type RecordBoardWidgetProps = {
  isUIEditable?: boolean;
};

export const RecordBoardWidget = ({
  isUIEditable = false,
}: RecordBoardWidgetProps) => {
  const { objectNameSingular, recordIndexId, viewBarInstanceId } =
    useRecordIndexContextOrThrow();

  return (
    <>
      <RecordBoardWidgetStatesEffect
        recordBoardId={recordIndexId}
        isUIEditable={isUIEditable}
      />
      <div {...stylex.props(styles.boardContainer)}>
        <RecordBoardContainer
          recordBoardId={recordIndexId}
          viewBarId={viewBarInstanceId}
          objectNameSingular={objectNameSingular}
        />
      </div>
    </>
  );
};
