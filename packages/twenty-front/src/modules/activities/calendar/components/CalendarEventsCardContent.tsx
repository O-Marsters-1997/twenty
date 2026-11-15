import { CalendarMonthCard } from '@/activities/calendar/components/CalendarMonthCard';
import { CalendarContext } from '@/activities/calendar/contexts/CalendarContext';
import { useCalendarEvents } from '@/activities/calendar/hooks/useCalendarEvents';
import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { StyledWidgetScrollContainer } from '@/ui/layout/components/WidgetContentContainer';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { format, getYear } from 'date-fns';
import { Section } from 'twenty-ui/components/layout';

import { Heading } from 'twenty-ui/primitives/typography';
import { type TimelineCalendarEvent } from '~/generated/graphql';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-8'],
  },
  titleContainer: {
    marginBottom: spacing['--t-spacing-2'],
  },
  title: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: 'inherit',
  },
  year: {
    color: fontColor['--t-font-color-light'],
  },
});

type CalendarEventsCardContentProps = {
  firstQueryLoading: boolean;
  isFetchingMore: boolean;
  objectName: string;
  onLastRowVisible: () => Promise<void>;
  timelineCalendarEvents: TimelineCalendarEvent[] | undefined;
};

export const CalendarEventsCardContent = ({
  firstQueryLoading,
  isFetchingMore,
  objectName,
  onLastRowVisible,
  timelineCalendarEvents,
}: CalendarEventsCardContentProps) => {
  const { t } = useLingui();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  const {
    calendarEventsByDayTime,
    daysByMonthTime,
    monthTimes,
    monthTimesByYear,
  } = useCalendarEvents(timelineCalendarEvents ?? []);

  if (firstQueryLoading) {
    return <SkeletonLoader />;
  }

  if (!timelineCalendarEvents?.length) {
    // TODO: change animated placeholder
    return (
      <EmptyState.Root>
        <AnimatedPlaceholder type="noMatchRecord" />
        <EmptyState.Content>
          <EmptyState.Title>{t`No Events`}</EmptyState.Title>
          <EmptyState.Description>
            {t`No events have been scheduled with this ${objectName} yet.`}
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    );
  }

  return (
    <CalendarContext.Provider
      value={{
        calendarEventsByDayTime,
      }}
    >
      <StyledWidgetScrollContainer {...stylex.props(styles.container)}>
        {monthTimes.map((monthTime) => {
          const monthDayTimes = daysByMonthTime[monthTime] || [];
          const year = getYear(monthTime);
          const lastMonthTimeOfYear = monthTimesByYear[year]?.[0];
          const isLastMonthOfYear = lastMonthTimeOfYear === monthTime;
          const monthLabel = format(monthTime, 'MMMM', {
            locale: localeCatalog,
          });

          return (
            <Section.Root key={monthTime}>
              <div {...stylex.props(styles.titleContainer)}>
                <Heading level={3} size="lg" xstyle={styles.title}>
                  {monthLabel}
                  {isLastMonthOfYear && (
                    <span {...stylex.props(styles.year)}> {year}</span>
                  )}
                </Heading>
              </div>
              <CalendarMonthCard dayTimes={monthDayTimes} />
            </Section.Root>
          );
        })}
        <CustomResolverFetchMoreLoader
          loading={isFetchingMore}
          onLastRowVisible={onLastRowVisible}
        />
      </StyledWidgetScrollContainer>
    </CalendarContext.Provider>
  );
};
