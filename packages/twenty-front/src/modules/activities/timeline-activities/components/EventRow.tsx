import { styled } from '@linaria/react';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useContext } from 'react';
import { TimelineActivityContext } from '@/activities/timeline-activities/contexts/TimelineActivityContext';

import { TIMELINE_ICON_SLOT_SIZE } from '@/activities/timeline-activities/constants/TimelineIconSlotSize';
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
import { themeCssVariables } from 'twenty-ui/theme';
import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  timelineItemContainer: {
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    gap: spacing['--t-spacing-4'],
    justifyContent: 'space-between',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  verticalLine: {
    background: borderColor['--t-border-color-light'],
    flex: '1',
    width: '2px',
    zIndex: '2',
  },
});

const StyledLeftContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: ${TIMELINE_ICON_SLOT_SIZE}px;
`;

const StyledIconContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  height: ${TIMELINE_ICON_SLOT_SIZE}px;
  justify-content: center;
  user-select: none;
  width: 100%;
  z-index: 2;
`;

const StyledItemContainer = styled.div<{ isMarginBottom?: boolean }>`
  align-items: flex-start;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin-bottom: ${({ isMarginBottom }) =>
    isMarginBottom ? themeCssVariables.spacing[3] : '0'};
  min-height: ${TIMELINE_ICON_SLOT_SIZE}px;
  min-width: 0;
  overflow: hidden;
`;

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
        <StyledLeftContainer>
          <StyledIconContainer>
            <EventIconDynamicComponent
              eventIcon={timelineActivityType?.icon ?? null}
              linkedObjectMetadataItem={linkedObjectMetadataItem}
            />
          </StyledIconContainer>
          {!isLastEvent && <div {...stylex.props(styles.verticalLine)} />}
        </StyledLeftContainer>
        <StyledItemContainer isMarginBottom={!isLastEvent}>
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
        </StyledItemContainer>
      </div>
    </>
  );
};
