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
    gap: spacing['--t-spacing-2'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  calendarEventContent: {
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
  },
  calendarEventTop: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  calendarEventTitle: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  calendarEventBody: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexBasis: '0',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '0',
    justifyContent: 'center',
  },
  calendarEventDateCard: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: spacing['--t-spacing-1'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
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
