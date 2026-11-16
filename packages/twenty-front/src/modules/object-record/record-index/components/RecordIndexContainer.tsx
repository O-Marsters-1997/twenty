import { RecordBoardContainer } from '@/object-record/record-board/components/RecordBoardContainer';
import { RecordIndexTableContainer } from '@/object-record/record-index/components/RecordIndexTableContainer';
import { recordIndexViewTypeState } from '@/object-record/record-index/states/recordIndexViewTypeState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';

import { RecordIndexCalendarContainer } from '@/object-record/record-index/components/RecordIndexCalendarContainer';
import { RecordIndexEmptyStateNotShared } from '@/object-record/record-index/components/RecordIndexEmptyStateNotShared';
import { RecordIndexFiltersToContextStoreEffect } from '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect';
import { useHasCurrentViewNonReadableFields } from '@/object-record/record-index/hooks/useHasCurrentViewNonReadableFields';
import { RecordList } from '@/object-record/record-list/components/RecordList';
import { ViewType } from '@/views/types/ViewType';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  containerWithPadding: {
    boxSizing: 'border-box',
    flex: '1',
    marginLeft: spacing['--t-spacing-2'],
    minHeight: '0',
  },
});

export const RecordIndexContainer = () => {
  const recordIndexViewType = useAtomComponentStateValue(
    recordIndexViewTypeState,
  );

  const { recordIndexId, objectMetadataItem, objectNameSingular } =
    useRecordIndexContextOrThrow();

  const { hasCurrentViewNonReadableFields, nonReadableViewFieldInfo } =
    useHasCurrentViewNonReadableFields(objectMetadataItem);

  return (
    <div {...stylex.props(styles.container)}>
      {hasCurrentViewNonReadableFields ? (
        <RecordIndexEmptyStateNotShared
          nonReadableViewFieldInfo={nonReadableViewFieldInfo}
        />
      ) : (
        <>
          <RecordIndexFiltersToContextStoreEffect />
          {recordIndexViewType === ViewType.TABLE && (
            <RecordIndexTableContainer recordTableId={recordIndexId} />
          )}
          {recordIndexViewType === ViewType.KANBAN && (
            <div {...stylex.props(styles.containerWithPadding)}>
              <RecordBoardContainer
                recordBoardId={recordIndexId}
                viewBarId={recordIndexId}
                objectNameSingular={objectNameSingular}
              />
            </div>
          )}
          {recordIndexViewType === ViewType.CALENDAR && (
            <div {...stylex.props(styles.containerWithPadding)}>
              <RecordIndexCalendarContainer />
            </div>
          )}
          {recordIndexViewType === ViewType.LIST && (
            <div {...stylex.props(styles.containerWithPadding)}>
              <RecordList />
            </div>
          )}
        </>
      )}
    </div>
  );
};
