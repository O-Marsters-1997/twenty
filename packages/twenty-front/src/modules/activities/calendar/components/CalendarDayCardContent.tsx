import { differenceInSeconds, endOfDay, format } from 'date-fns';

import { CalendarEventRow } from '@/activities/calendar/components/CalendarEventRow';
import { getCalendarEventStartDate } from '@/activities/calendar/utils/getCalendarEventStartDate';
import { Card } from 'twenty-ui/primitives/surfaces';
import { type TimelineCalendarEvent } from '~/generated/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  background,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type CalendarDayCardContentProps = {
  calendarEvents: TimelineCalendarEvent[];
  divider?: boolean;
};

const calendarDayEnded = stylex.keyframes({
  to: { backgroundColor: background['--t-background-primary'] },
});

const styles = stylex.create({
  dayCardContent: {
    gap: spacing['--t-spacing-3'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
    alignItems: 'flex-start',
    animationDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    animationFillMode: 'forwards',
    animationName: calendarDayEnded,
    animationTimingFunction: 'ease',
    display: 'flex',
    flexDirection: 'row',
  },
  dayCardContentDelay: (animationDelay: string) => ({ animationDelay }),
  dayContainer: {
    textAlign: 'center',
    width: spacing['--t-spacing-6'],
  },
  weekDay: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xxs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  monthDay: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  events: {
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: 'auto',
    gap: spacing['--t-spacing-3'],
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
  },
  eventRowContainer: {
    flexBasis: 'auto',
    flexGrow: '1',
    flexShrink: '0',
  },
});

export const CalendarDayCardContent = ({
  calendarEvents,
  divider,
}: CalendarDayCardContentProps) => {
  const endOfDayDate = endOfDay(getCalendarEventStartDate(calendarEvents[0]));
  const dayEndsIn = differenceInSeconds(endOfDayDate, Date.now());

  const weekDayLabel = format(endOfDayDate, 'EE');
  const monthDayLabel = format(endOfDayDate, 'dd');

  return (
    <div>
      <Card.Content
        divider={divider}
        xstyle={[
          styles.dayCardContent,
          styles.dayCardContentDelay(`${Math.max(0, dayEndsIn)}s`),
        ]}
      >
        <div {...stylex.props(styles.dayContainer)}>
          <div {...stylex.props(styles.weekDay)}>{weekDayLabel}</div>
          <div {...stylex.props(styles.monthDay)}>{monthDayLabel}</div>
        </div>
        <div {...stylex.props(styles.events)}>
          {calendarEvents.map((calendarEvent) => (
            <div
              key={calendarEvent.id}
              {...stylex.props(styles.eventRowContainer)}
            >
              <CalendarEventRow calendarEvent={calendarEvent} />
            </div>
          ))}
        </div>
      </Card.Content>
    </div>
  );
};
