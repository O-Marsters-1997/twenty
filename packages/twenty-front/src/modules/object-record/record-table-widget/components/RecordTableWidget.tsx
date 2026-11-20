import { RecordIndexTableContainerEffect } from '@/object-record/record-index/components/RecordIndexTableContainerEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RecordTableWidgetStatesEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetStatesEffect';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { RecordTableWithWrappers } from '@/object-record/record-table/components/RecordTableWithWrappers';
import { useContext } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  tableContainer: {
    overflow: 'hidden',
    minHeight: '0',
  },
});

type RecordTableWidgetProps = {
  isUIEditable?: boolean;
  isEmptyStateHidden?: boolean;
};

export const RecordTableWidget = ({
  isUIEditable = false,
  isEmptyStateHidden = false,
}: RecordTableWidgetProps) => {
  const { objectNameSingular, recordIndexId, viewBarInstanceId } =
    useRecordIndexContextOrThrow();
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  return (
    <>
      <RecordTableWidgetStatesEffect
        recordTableId={recordIndexId}
        isUIEditable={isUIEditable}
        isPageLayoutInEditMode={
          recordTableWidgetContext?.isPageLayoutInEditMode
        }
        isEmptyStateHidden={isEmptyStateHidden}
      />
      <RecordIndexTableContainerEffect />
      <div {...stylex.props(styles.tableContainer)}>
        <RecordTableWithWrappers
          recordTableId={recordIndexId}
          objectNameSingular={objectNameSingular}
          viewBarId={viewBarInstanceId}
        />
      </div>
    </>
  );
};
