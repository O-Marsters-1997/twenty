import { EventRow } from '@/activities/timeline-activities/components/EventRow';
import { timelineIconSlot } from '../constants/TimelineIconSlotSize.stylex';
import { type EventGroup } from '@/activities/timeline-activities/utils/groupEventsByMonth';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type EventsGroupProps = {
  group: EventGroup;
  month: string;
  year?: number;
  mainObjectMetadataItem: EnrichedObjectMetadataItem | null;
};

const styles = stylex.create({
  activityGroupBar: {
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    height: '100%',
    insetInlineStart: 0,
    position: 'absolute',
    top: 0,
    width: timelineIconSlot.size,
  },
  activityGroup: {
    display: 'flex',
    flexFlow: 'column',
    gap: spacing['--t-spacing-4'],
    marginBottom: spacing['--t-spacing-4'],
    width: '100%',
  },
  activityGroupContainer: {
    marginBottom: spacing['--t-spacing-3'],
    marginTop: spacing['--t-spacing-3'],
    position: 'relative',
  },
  monthSeperator: {
    alignItems: 'center',
    alignSelf: 'stretch',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-4'],
  },
  monthSeperatorLine: {
    backgroundColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    cornerShape: 'round',
    flex: '1 0 0',
    height: '1px',
  },
});

export const EventsGroup = ({
  group,
  month,
  year,
  mainObjectMetadataItem,
}: EventsGroupProps) => {
  return (
    <div {...stylex.props(styles.activityGroup)}>
      <div {...stylex.props(styles.monthSeperator)}>
        {month} {year}
        <div {...stylex.props(styles.monthSeperatorLine)} />
      </div>
      <div {...stylex.props(styles.activityGroupContainer)}>
        <div {...stylex.props(styles.activityGroupBar)} />
        {group.items.map((event, index) => (
          <EventRow
            mainObjectMetadataItem={mainObjectMetadataItem}
            key={index}
            event={event}
            isLastEvent={index === group.items.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
