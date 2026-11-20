import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useContext } from 'react';
import { TimelineActivityContext } from '@/activities/timeline-activities/contexts/TimelineActivityContext';

import { timelineIconSlot } from '../constants/TimelineIconSlotSize.stylex';
import { EventIconDynamicComponent } from '@/activities/timeline-activities/rows/components/EventIconDynamicComponent';
import { EventRowDynamicComponent } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent';
import { getStandardTimelineActivityRenderer } from '@/activities/timeline-activities/rows/components/StandardTimelineActivityRenderer';
import { type TimelineActivity } from '@/activities/timeline-activities/types/TimelineActivity';
import { useTimelineActivityTypes } from '@/activities/timeline-activities/hooks/useTimelineActivityTypes';
import { getTimelineActivityAction } from '@/activities/timeline-activities/utils/getTimelineActivityAction';
import { getTimelineActivityType } from '@/activities/timeline-activities/utils/getTimelineActivityType';
import { getTimelineActivityLinkedObjectMetadataItem } from '@/activities/timeline-activities/utils/getTimelineActivityLinkedObjectMetadataItem';
import { getTimelineActivityAuthorFullName } from '@/activities/timeline-activities/utils/getTimelineActivityAuthorFullName';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  leftContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: timelineIconSlot.size,
  },
  iconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    userSelect: 'none',
    zIndex: 2,
    height: timelineIconSlot.size,
    width: '100%',
  },
  itemContainer: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 0,
    minHeight: timelineIconSlot.size,
    minWidth: 0,
  },
  itemContainerWithMargin: {
    marginBottom: spacing['--t-spacing-3'],
  },
  timelineItemContainer: {
    gap: spacing['--t-spacing-4'],
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
  },
  verticalLine: {
    flex: '1',
    backgroundColor: borderColor['--t-border-color-light'],
    zIndex: '2',
    width: '2px',
  },
});

type EventRowProps = {
  mainObjectMetadataItem: EnrichedObjectMetadataItem | null;
  isLastEvent?: boolean;
  event: TimelineActivity;
};

export const EventRow = ({
  isLastEvent,
  event,
  mainObjectMetadataItem,
}: EventRowProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );

  const { recordId } = useContext(TimelineActivityContext);

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  const { timelineActivityTypeMaps } = useTimelineActivityTypes();

  const { objectMetadataItems } = useObjectMetadataItems();

  const timelineActivityType = getTimelineActivityType(
    event,
    timelineActivityTypeMaps,
  );

  const renderer = getStandardTimelineActivityRenderer(
    timelineActivityType?.frontComponentUniversalIdentifier,
  );

  const timelineActivityAction = getTimelineActivityAction(
    event,
    timelineActivityTypeMaps,
  );

  const linkedObjectMetadataItem =
    getTimelineActivityLinkedObjectMetadataItem({
      timelineActivity: event,
      timelineActivityTypeMaps,
      objectMetadataItems,
    }) ?? null;

  if (!isDefined(currentWorkspaceMember)) {
    return null;
  }

  if (!isDefined(recordStore)) {
    return null;
  }
  if (!isDefined(mainObjectMetadataItem)) {
    return null;
  }

  const labelIdentifier = getObjectRecordIdentifier({
    objectMetadataItem: mainObjectMetadataItem,
    record: recordStore,
    allowRequestsToTwentyIcons,
  });

  const authorFullName = getTimelineActivityAuthorFullName(
    event,
    currentWorkspaceMember,
  );

  return (
    <>
      <div {...stylex.props(styles.timelineItemContainer)}>
        <div {...stylex.props(styles.leftContainer)}>
          <div {...stylex.props(styles.iconContainer)}>
            <EventIconDynamicComponent
              eventIcon={timelineActivityType?.icon ?? null}
              linkedObjectMetadataItem={linkedObjectMetadataItem}
            />
          </div>
          {!isLastEvent && <div {...stylex.props(styles.verticalLine)} />}
        </div>
        <div
          {...stylex.props(
            styles.itemContainer,
            !isLastEvent && styles.itemContainerWithMargin,
          )}
        >
          <EventRowDynamicComponent
            authorFullName={authorFullName}
            labelIdentifierValue={labelIdentifier.name}
            event={event}
            eventAction={timelineActivityAction}
            eventTypeLabel={timelineActivityType?.label}
            renderer={renderer}
            mainObjectMetadataItem={mainObjectMetadataItem}
            linkedObjectMetadataItem={linkedObjectMetadataItem}
            happensAt={event.happensAt}
          />
        </div>
      </div>
    </>
  );
};
