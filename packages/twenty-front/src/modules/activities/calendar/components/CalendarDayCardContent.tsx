import { styled } from '@linaria/react';
import { differenceInSeconds, endOfDay, format } from 'date-fns';

import { CalendarEventRow } from '@/activities/calendar/components/CalendarEventRow';
import { getCalendarEventStartDate } from '@/activities/calendar/utils/getCalendarEventStartDate';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import { type TimelineCalendarEvent } from '~/generated/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type CalendarDayCardContentProps = {
  calendarEvents: TimelineCalendarEvent[];
  divider?: boolean;
};

const StyledCardContentContainer = styled.div`
  > div {
    align-items: flex-start;
    display: flex;
    flex-direction: row;
    gap: ${themeCssVariables.spacing[3]};
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  }
`;

const StyledDayCardContent = styled(Card.Content)`
  @keyframes calendarDayEnded {
    to {
      background-color: ${themeCssVariables.background.primary};
    }
  }

  animation: calendarDayEnded calc(var(--t-animation-duration-fast) * 1s) ease
    forwards;
`;

const styles = stylex.create({
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
    alignItems: 'stretch',
    display: 'flex',
    flex: '1 0 auto',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  eventRowContainer: {
    flex: '1 0 auto',
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
    <StyledCardContentContainer>
      <StyledDayCardContent
        divider={divider}
        style={{ animationDelay: `${Math.max(0, dayEndsIn)}s` }}
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
      </StyledDayCardContent>
    </StyledCardContentContainer>
  );
};
