import { t } from '@lingui/core/macro';
import { format } from 'date-fns';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  CalendarChannelVisibility,
  type TimelineCalendarEvent,
} from '~/generated/graphql';

import { CalendarEventNotSharedContent } from '@/activities/calendar/components/CalendarEventNotSharedContent';
import { CalendarEventParticipantsAvatarGroup } from '@/activities/calendar/components/CalendarEventParticipantsAvatarGroup';
import { getCalendarEventEndDate } from '@/activities/calendar/utils/getCalendarEventEndDate';
import { getCalendarEventStartDate } from '@/activities/calendar/utils/getCalendarEventStartDate';
import { hasCalendarEventEnded } from '@/activities/calendar/utils/hasCalendarEventEnded';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useOpenCalendarEventInSidePanel } from '@/side-panel/hooks/useOpenCalendarEventInSidePanel';
import { IconArrowRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, fontColor, fontWeight, spacing, tagBackground } from 'twenty-ui/theme/tokens.stylex';

type CalendarEventRowProps = {
  calendarEvent: TimelineCalendarEvent;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    cursor: 'not-allowed',
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    height: spacing['--t-spacing-6'],
    position: 'relative',
  },
  containerClickable: {
    cursor: 'pointer',
  },
  attendanceIndicator: {
    backgroundColor: tagBackground['--t-tag-background-gray'],
    borderRadius: borderRadius['--t-border-radius-xs'],
    height: '100%',
    width: spacing['--t-spacing-1'],
  },
  attendanceIndicatorActive: {
    backgroundColor: tagBackground['--t-tag-background-red'],
  },
  title: {
    color: 'inherit',
    flex: '1 0 auto',
    fontWeight: 'inherit',
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: spacing['--t-spacing-10'],
  },
  titleActive: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  titleCanceled: {
    textDecoration: 'line-through',
  },
  labels: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: '1 0 auto',
    gap: spacing['--t-spacing-2'],
  },
  time: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    width: spacing['--t-spacing-26'],
  },
});

export const CalendarEventRow = ({ calendarEvent }: CalendarEventRowProps) => {
  const theme = useTheme();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { openCalendarEventInSidePanel } = useOpenCalendarEventInSidePanel();

  const startsAt = getCalendarEventStartDate(calendarEvent);
  const endsAt = getCalendarEventEndDate(calendarEvent);
  const hasEnded = hasCalendarEventEnded(calendarEvent);

  const startTimeLabel = calendarEvent.isFullDay
    ? t`All day`
    : format(startsAt, 'HH:mm');
  const endTimeLabel = calendarEvent.isFullDay ? '' : format(endsAt, 'HH:mm');

  const isCurrentWorkspaceMemberAttending = calendarEvent.participants?.some(
    ({ workspaceMemberId }) => workspaceMemberId === currentWorkspaceMember?.id,
  );
  const showTitle =
    calendarEvent.visibility === CalendarChannelVisibility.SHARE_EVERYTHING;

  return (
    <div
      {...stylex.props(styles.container, showTitle && styles.containerClickable)}
      onClick={
        showTitle
          ? () => {
              openCalendarEventInSidePanel(calendarEvent.id);
            }
          : undefined
      }
    >
      <div
        {...stylex.props(
          styles.attendanceIndicator,
          isCurrentWorkspaceMemberAttending && styles.attendanceIndicatorActive,
        )}
      />
      <div {...stylex.props(styles.labels)}>
        <div {...stylex.props(styles.time)}>
          {startTimeLabel}
          {endTimeLabel && (
            <>
              <IconArrowRight size={theme.icon.size.sm} />
              {endTimeLabel}
            </>
          )}
        </div>
        {showTitle ? (
          <div
            {...stylex.props(
              styles.title,
              !hasEnded && styles.titleActive,
              calendarEvent.isCanceled && styles.titleCanceled,
            )}
          >
            {calendarEvent.title}
          </div>
        ) : (
          <CalendarEventNotSharedContent />
        )}
      </div>
      {!!calendarEvent.participants?.length && (
        <CalendarEventParticipantsAvatarGroup
          participants={calendarEvent.participants ?? []}
        />
      )}
    </div>
  );
};
