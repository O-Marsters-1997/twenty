import * as stylex from '@stylexjs/stylex';
import { EventRowDate } from '@/activities/timeline-activities/rows/components/EventRowDate';
import { type EventRowNativeComponentProps } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent.types';
import { EventRowItem } from '@/activities/timeline-activities/rows/components/EventRowItem';
import { eventRowStyles } from '@/activities/timeline-activities/rows/components/EventRowStyles';
import { EventRowMainObjectUpdated } from '@/activities/timeline-activities/rows/main-object/components/EventRowMainObjectUpdated';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

type EventRowMainObjectProps = EventRowNativeComponentProps;

export const EventRowMainObject = ({
  authorFullName,
  labelIdentifierValue,
  event,
  eventAction,
  eventTypeLabel,
  mainObjectMetadataItem,
  happensAt,
  hasRenderer,
}: EventRowMainObjectProps) => {
  switch (eventAction) {
    case 'created': {
      return (
        <div {...stylex.props(eventRowStyles.row)}>
          <div {...stylex.props(eventRowStyles.container)}>
            <div {...stylex.props(eventRowStyles.content)}>
              <EventRowItem>{labelIdentifierValue}</EventRowItem>
              <EventRowItem variant="action">
                {eventTypeLabel ?? t`was created by`}
              </EventRowItem>
              <EventRowItem>{authorFullName}</EventRowItem>
            </div>
            <EventRowDate happensAt={happensAt} />
          </div>
        </div>
      );
    }
    case 'updated': {
      return (
        <EventRowMainObjectUpdated
          authorFullName={authorFullName}
          labelIdentifierValue={labelIdentifierValue}
          event={event}
          eventTypeLabel={eventTypeLabel}
          mainObjectMetadataItem={mainObjectMetadataItem}
          happensAt={happensAt}
          hasRenderer={hasRenderer}
        />
      );
    }
    case 'deleted': {
      return (
        <div {...stylex.props(eventRowStyles.row)}>
          <div {...stylex.props(eventRowStyles.container)}>
            <div {...stylex.props(eventRowStyles.content)}>
              <EventRowItem>{labelIdentifierValue}</EventRowItem>
              <EventRowItem variant="action">
                {eventTypeLabel ?? t`was deleted by`}
              </EventRowItem>
              <EventRowItem>{authorFullName}</EventRowItem>
            </div>
            <EventRowDate happensAt={happensAt} />
          </div>
        </div>
      );
    }
    case 'restored': {
      return (
        <div {...stylex.props(eventRowStyles.row)}>
          <div {...stylex.props(eventRowStyles.container)}>
            <div {...stylex.props(eventRowStyles.content)}>
              <EventRowItem>{labelIdentifierValue}</EventRowItem>
              <EventRowItem variant="action">
                {eventTypeLabel ?? t`was restored by`}
              </EventRowItem>
              <EventRowItem>{authorFullName}</EventRowItem>
            </div>
            <EventRowDate happensAt={happensAt} />
          </div>
        </div>
      );
    }
    default: {
      if (!isDefined(eventTypeLabel)) {
        return null;
      }

      return (
        <div {...stylex.props(eventRowStyles.row)}>
          <div {...stylex.props(eventRowStyles.container)}>
            <div {...stylex.props(eventRowStyles.content)}>
              <EventRowItem>{authorFullName}</EventRowItem>
              <EventRowItem variant="action">{eventTypeLabel}</EventRowItem>
              <EventRowItem>{labelIdentifierValue}</EventRowItem>
            </div>
            <EventRowDate happensAt={happensAt} />
          </div>
        </div>
      );
    }
  }
};
