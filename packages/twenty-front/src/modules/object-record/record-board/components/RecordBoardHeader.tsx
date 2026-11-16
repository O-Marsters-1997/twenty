import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { RecordBoardColumnDnd } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnDnd';
import { getRecordBoardHeaderHtmlId } from '@/object-record/record-board/utils/getRecordBoardHeaderHtmlId';
import { RecordIndexGroupAggregatesDataLoader } from '@/object-record/record-index/components/RecordIndexGroupAggregatesDataLoader';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

const styles = stylex.create({
  headerContainer: {
    display: 'flex',
    flexDirection: 'row',
    height: '40px',
    overflow: 'visible',
    position: {
      default: null,
      ':is([data-sticky="true"])': 'sticky',
    },
    top: {
      default: null,
      ':is([data-sticky="true"])': '0',
    },
    width: '100%',
    zIndex: 10,
  },
});

export const RecordBoardHeader = () => {
  const { recordBoardId } = useContext(RecordBoardContext);

  return (
    <div
      id={getRecordBoardHeaderHtmlId(recordBoardId)}
      {...stylex.props(styles.headerContainer)}
    >
      <RecordBoardColumnDnd />
      <RecordIndexGroupAggregatesDataLoader />
    </div>
  );
};
