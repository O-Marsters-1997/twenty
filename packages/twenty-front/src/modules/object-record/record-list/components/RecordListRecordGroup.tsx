import { useCurrentRecordGroupId } from '@/object-record/record-group/hooks/useCurrentRecordGroupId';
import { useShouldHideRecordGroup } from '@/object-record/record-group/hooks/useShouldHideRecordGroup';
import { useRecordIndexTableQuery } from '@/object-record/record-index/hooks/useRecordIndexTableQuery';
import { RecordListRecordGroupSection } from '@/object-record/record-list/components/RecordListRecordGroupSection';
import { RecordListRecords } from '@/object-record/record-list/components/RecordListRecords';
import { RecordListRecordsEffect } from '@/object-record/record-list/components/RecordListRecordsEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { isRecordListGroupSectionToggledComponentState } from '@/object-record/record-list/states/isRecordListGroupSectionToggledComponentState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: '14px',
  },
});

export const RecordListRecordGroup = () => {
  const { objectNameSingular } = useRecordIndexContextOrThrow();

  const currentRecordGroupId = useCurrentRecordGroupId();

  const shouldHideRecordGroup = useShouldHideRecordGroup(currentRecordGroupId);

  const { records, loading, error, hasNextPage, fetchMoreRecords } =
    useRecordIndexTableQuery(objectNameSingular);

  const isRecordListGroupSectionToggled = useAtomComponentFamilyStateValue(
    isRecordListGroupSectionToggledComponentState,
    currentRecordGroupId,
  );

  return (
    <>
      <RecordListRecordsEffect
        records={records}
        loading={loading}
        error={error}
      />
      {!shouldHideRecordGroup && (
        <div {...stylex.props(styles.section)}>
          <RecordListRecordGroupSection />
          {isRecordListGroupSectionToggled && !isDefined(error) && (
            <RecordListRecords
              records={records}
              loading={loading}
              hasNextPage={hasNextPage}
              fetchMoreRecords={fetchMoreRecords}
            />
          )}
        </div>
      )}
    </>
  );
};
