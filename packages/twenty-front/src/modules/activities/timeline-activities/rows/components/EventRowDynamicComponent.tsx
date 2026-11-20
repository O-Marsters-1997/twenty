import { type EventRowDynamicComponentProps } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent.types';
import { EventCard } from '@/activities/timeline-activities/rows/components/EventCard';
import { EventCardToggleButton } from '@/activities/timeline-activities/rows/components/EventCardToggleButton';
import { EventRowGenericLinked } from '@/activities/timeline-activities/rows/generic/components/EventRowGenericLinked';
import { EventRowMainObject } from '@/activities/timeline-activities/rows/main-object/components/EventRowMainObject';
import { Suspense, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  nativeRowContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'flex-start',
    display: 'flex',
    width: '100%',
  },
  nativeRow: {
    minWidth: '0',
    width: '100%',
  },
});

export const EventRowDynamicComponent = ({
  labelIdentifierValue,
  event,
  eventAction,
  eventTypeLabel,
  renderer: Renderer,
  mainObjectMetadataItem,
  linkedObjectMetadataItem,
  authorFullName,
  happensAt,
}: EventRowDynamicComponentProps) => {
  const [isRendererOpen, setIsRendererOpen] = useState(false);
  const EventRowComponent = isDefined(event.linkedRecordId)
    ? EventRowGenericLinked
    : EventRowMainObject;

  const nativeRenderer = (
    <EventRowComponent
      labelIdentifierValue={labelIdentifierValue}
      event={event}
      eventAction={eventAction}
      eventTypeLabel={eventTypeLabel}
      hasRenderer={isDefined(Renderer)}
      mainObjectMetadataItem={mainObjectMetadataItem}
      linkedObjectMetadataItem={linkedObjectMetadataItem}
      authorFullName={authorFullName}
      happensAt={happensAt}
    />
  );

  if (!isDefined(Renderer)) {
    return nativeRenderer;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.nativeRowContainer)}>
        <div {...stylex.props(styles.nativeRow)}>{nativeRenderer}</div>
        <EventCardToggleButton
          isOpen={isRendererOpen}
          setIsOpen={setIsRendererOpen}
        />
      </div>
      {isRendererOpen && (
        <EventCard isOpen>
          <Suspense fallback={null}>
            <Renderer event={event} authorFullName={authorFullName} />
          </Suspense>
        </EventCard>
      )}
    </div>
  );
};
