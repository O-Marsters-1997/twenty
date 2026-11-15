import * as stylex from '@stylexjs/stylex';
import { t } from '@lingui/core/macro';
import { type KeyboardEvent, useState } from 'react';

import { EventCard } from '@/activities/timeline-activities/rows/components/EventCard';
import { EventCardToggleButton } from '@/activities/timeline-activities/rows/components/EventCardToggleButton';
import { EventRowDate } from '@/activities/timeline-activities/rows/components/EventRowDate';
import { type EventRowNativeComponentProps } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent.types';
import { EventRowItem } from '@/activities/timeline-activities/rows/components/EventRowItem';
import { eventRowStyles } from '@/activities/timeline-activities/rows/components/EventRowStyles';
import { getAuthorizedLinkedRecordName } from '@/activities/timeline-activities/rows/generic/utils/getAuthorizedLinkedRecordName';
import { allowRequestsToTwentyIconsState } from '@/client-config/states/allowRequestsToTwentyIcons';
import { recordStoreIdentifierFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreIdentifierFamilySelector';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { SidePanelSearchRecordPreviewCard } from '@/side-panel/pages/search/components/SidePanelSearchRecordPreviewCard';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';

type EventRowGenericLinkedProps = EventRowNativeComponentProps;

export const EventRowGenericLinked = ({
  event,
  eventTypeLabel,
  authorFullName,
  linkedObjectMetadataItem,
  happensAt,
  hasRenderer,
}: EventRowGenericLinkedProps) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const [isOpen, setIsOpen] = useState(false);

  const allowRequestsToTwentyIcons = useAtomStateValue(
    allowRequestsToTwentyIconsState,
  );
  const linkedRecordIdentifier = useAtomFamilySelectorValue(
    recordStoreIdentifierFamilySelector,
    {
      recordId: event.linkedRecordId ?? '',
      allowRequestsToTwentyIcons,
    },
  );

  const objectLabel =
    linkedObjectMetadataItem?.labelSingular?.toLowerCase() ?? t`record`;

  const linkedRecordName = getAuthorizedLinkedRecordName(
    linkedRecordIdentifier?.name,
  );

  const linkedRecord =
    isDefined(event.linkedRecordId) &&
    isDefined(linkedObjectMetadataItem?.nameSingular)
      ? {
          id: event.linkedRecordId,
          objectNameSingular: linkedObjectMetadataItem.nameSingular,
        }
      : undefined;

  const canOpen =
    hasRenderer !== true &&
    isDefined(linkedRecord) &&
    isDefined(linkedRecordName);

  const handleOpen = () => {
    if (!isDefined(linkedRecord)) {
      return;
    }

    openRecordInSidePanel({
      recordId: linkedRecord.id,
      objectNameSingular: linkedRecord.objectNameSingular,
    });
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLSpanElement>) => {
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      handleOpen();
    }
  };

  return (
    <div {...stylex.props(eventRowStyles.row)}>
      <div {...stylex.props(eventRowStyles.container)}>
        <div {...stylex.props(eventRowStyles.content)}>
          <EventRowItem>{authorFullName}</EventRowItem>
          <EventRowItem variant="action">
            {eventTypeLabel ?? t`linked a ${objectLabel}`}
          </EventRowItem>
          {canOpen && (
            <span {...stylex.props(eventRowStyles.linkedRecord)}
              role="button"
              tabIndex={0}
              onClick={handleOpen}
              onKeyDown={handleKeyDown}
            >
              <OverflowingTextWithTooltip text={linkedRecordName} />
            </span>
          )}
          {canOpen && (
            <EventCardToggleButton isOpen={isOpen} setIsOpen={setIsOpen} />
          )}
        </div>
        <EventRowDate happensAt={happensAt} />
      </div>
      {canOpen && (
        <EventCard isOpen={isOpen}>
          <SidePanelSearchRecordPreviewCard
            objectNameSingular={linkedRecord.objectNameSingular}
            recordId={linkedRecord.id}
            label={linkedRecordName}
          />
        </EventCard>
      )}
    </div>
  );
};
