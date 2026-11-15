import { RecordDragEndDropZone } from '@/object-record/record-drag/components/RecordDragEndDropZone';
import { RecordGroupContext } from '@/object-record/record-group/states/context/RecordGroupContext';
import { NO_RECORD_GROUP_FAMILY_KEY } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import { RecordListAddNew } from '@/object-record/record-list/components/RecordListAddNew';
import { RecordListDraggableRow } from '@/object-record/record-list/components/RecordListDraggableRow';
import { RECORD_LIST_ROW_DND_TYPE } from '@/object-record/record-list/constants/RecordListRowDndType';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useContext } from 'react';
import { useInView } from 'react-intersection-observer';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  fetchMoreTrigger: {
    height: '0',
  },
});

type RecordListRecordsProps = {
  records: ObjectRecord[];
  loading: boolean;
  hasNextPage: boolean;
  fetchMoreRecords: () => void;
};

export const RecordListRecords = ({
  records,
  loading,
  hasNextPage,
  fetchMoreRecords,
}: RecordListRecordsProps) => {
  const { recordGroupId } = useContext(RecordGroupContext);

  const droppableId = isDefined(recordGroupId)
    ? recordGroupId
    : NO_RECORD_GROUP_FAMILY_KEY;

  const { ref: fetchMoreRef } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage && !loading) {
        fetchMoreRecords();
      }
    },
  });

  return (
    <>
      {records.map((record, index) => (
        <RecordListDraggableRow
          key={record.id}
          recordId={record.id}
          index={index}
          droppableId={droppableId}
        />
      ))}
      {hasNextPage && !loading && (
        <div ref={fetchMoreRef} {...stylex.props(styles.fetchMoreTrigger)} />
      )}
      <RecordDragEndDropZone
        droppableId={droppableId}
        dndType={RECORD_LIST_ROW_DND_TYPE}
        index={records.length}
      >
        {!loading && <RecordListAddNew />}
      </RecordDragEndDropZone>
    </>
  );
};
