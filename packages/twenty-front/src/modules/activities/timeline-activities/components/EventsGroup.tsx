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
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: background['--t-background-secondary'],
    insetInlineStart: 0,
    position: 'absolute',
    height: '100%',
    top: 0,
    width: timelineIconSlot.size,
  },
  activityGroup: {
    flexFlow: 'column',
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    marginBottom: spacing['--t-spacing-4'],
    width: '100%',
  },
  activityGroupContainer: {
    position: 'relative',
    marginBottom: spacing['--t-spacing-3'],
    marginTop: spacing['--t-spacing-3'],
  },
  monthSeperator: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
    alignSelf: 'stretch',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  monthSeperatorLine: {
    borderRadius: borderRadius['--t-border-radius-pill'],
    cornerShape: 'round',
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: '0',
    backgroundColor: borderColor['--t-border-color-light'],
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
