import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import {
  isDefined,
  isFieldValueRestricted,
  isNonEmptyArray,
} from 'twenty-shared/utils';

import { CalendarEventNotSharedContent } from '@/activities/calendar/components/CalendarEventNotSharedContent';
import { CalendarEventParticipantsAvatarGroup } from '@/activities/calendar/components/CalendarEventParticipantsAvatarGroup';
import { type CalendarEvent } from '@/activities/calendar/types/CalendarEvent';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useOpenCalendarEventInSidePanel } from '@/side-panel/hooks/useOpenCalendarEventInSidePanel';
import { UserContext } from '@/users/contexts/UserContext';
import {
  formatToHumanReadableDay,
  formatToHumanReadableMonth,
  formatToHumanReadableTime,
} from '~/utils/format/formatDate';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  eventCardCalendarEventContainer: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
  calendarEventContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  calendarEventTop: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    width: '100%',
  },
  calendarEventTitle: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  calendarEventBody: {
    alignItems: 'flex-start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flex: '1 0 0',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
  },
  calendarEventDateCard: {
    alignItems: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  calendarEventDateCardMonth: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-xxs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  calendarEventDateCardDay: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

export const EventCardCalendarEvent = ({
  calendarEventId,
}: {
  calendarEventId: string;
}) => {
  const { openCalendarEventInSidePanel } = useOpenCalendarEventInSidePanel();
  const { timeZone } = useContext(UserContext);

  const {
    record: calendarEvent,
    loading,
    error,
  } = useFindOneRecord<CalendarEvent>({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    objectRecordId: calendarEventId,
    recordGqlFields: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      calendarEventParticipants: {
        person: true,
        workspaceMember: true,
        handle: true,
        displayName: true,
      },
    },
  });

  if (isDefined(error)) {
    if (CombinedGraphQLErrors.is(error)) {
      if (
        error.errors.some(
          (graphQLError) => graphQLError.extensions?.code === 'FORBIDDEN',
        )
      ) {
        return <CalendarEventNotSharedContent />;
      }

      if (
        error.errors.some(
          (graphQLError) => graphQLError.extensions?.code === 'NOT_FOUND',
        )
      ) {
        return <div>{t`Calendar event not found`}</div>;
      }
    }

    return <div>{t`Error loading calendar event`}</div>;
  }

  if (loading) {
    return <div>{t`Loading...`}</div>;
  }

  if (!isDefined(calendarEvent)) {
    return <CalendarEventNotSharedContent />;
  }

  if (isFieldValueRestricted(calendarEvent.title)) {
    return <CalendarEventNotSharedContent />;
  }

  if (!isDefined(calendarEvent.startsAt)) {
    return <div>{t`Calendar event has no start date`}</div>;
  }

  const startsAtMonth = formatToHumanReadableMonth(
    calendarEvent.startsAt,
    timeZone,
  );
  const startsAtDay = formatToHumanReadableDay(
    calendarEvent.startsAt,
    timeZone,
  );
  const startsAtTime = formatToHumanReadableTime(
    calendarEvent.startsAt,
    timeZone,
  );
  const endsAtTime = isDefined(calendarEvent.endsAt)
    ? formatToHumanReadableTime(calendarEvent.endsAt, timeZone)
    : null;
  return (
    <div
      onClick={() => openCalendarEventInSidePanel(calendarEventId)}
      {...stylex.props(styles.eventCardCalendarEventContainer)}
    >
      <div {...stylex.props(styles.calendarEventDateCard)}>
        <div {...stylex.props(styles.calendarEventDateCardMonth)}>
          {startsAtMonth}
        </div>
        <div {...stylex.props(styles.calendarEventDateCardDay)}>
          {startsAtDay}
        </div>
      </div>
      <div {...stylex.props(styles.calendarEventContent)}>
        <div {...stylex.props(styles.calendarEventTop)}>
          <div {...stylex.props(styles.calendarEventTitle)}>
            {calendarEvent.title}
          </div>
          {isNonEmptyArray(calendarEvent.calendarEventParticipants) && (
            <CalendarEventParticipantsAvatarGroup
              participants={calendarEvent.calendarEventParticipants ?? []}
            />
          )}
        </div>
        <div {...stylex.props(styles.calendarEventBody)}>
          {startsAtTime} {isDefined(endsAtTime) && <>→ {endsAtTime}</>}
        </div>
      </div>
    </div>
  );
};
