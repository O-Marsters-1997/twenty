import { RecordCalendarContainer } from '@/object-record/record-calendar/components/RecordCalendarContainer';
import { RecordCalendarWidgetReadOnlyEffect } from '@/object-record/record-calendar-widget/components/RecordCalendarWidgetReadOnlyEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexCalendarFieldMetadataIdComponentState } from '@/object-record/record-index/states/recordIndexCalendarFieldMetadataIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  calendarContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    overflow: 'hidden',
  },
});

type RecordCalendarWidgetProps = {
  isReadOnly?: boolean;
};

export const RecordCalendarWidget = ({
  isReadOnly = true,
}: RecordCalendarWidgetProps) => {
  const { objectNameSingular, recordIndexId, viewBarInstanceId } =
    useRecordIndexContextOrThrow();

  // Hydrated from the backing view (draft or persisted) so edit-mode previews work before save.
  const recordIndexCalendarFieldMetadataId = useAtomComponentStateValue(
    recordIndexCalendarFieldMetadataIdComponentState,
    recordIndexId,
  );

  if (!isDefined(recordIndexCalendarFieldMetadataId)) {
    return null;
  }

  return (
    <>
      <RecordCalendarWidgetReadOnlyEffect
        recordCalendarId={recordIndexId}
        isReadOnly={isReadOnly}
      />
      <div {...stylex.props(styles.calendarContainer)}>
        <RecordCalendarContainer
          objectNameSingular={objectNameSingular}
          viewBarInstanceId={viewBarInstanceId}
        />
      </div>
    </>
  );
};
