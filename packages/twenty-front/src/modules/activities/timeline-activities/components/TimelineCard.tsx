import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import * as stylex from '@stylexjs/stylex';

import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { EventList } from '@/activities/timeline-activities/components/EventList';
import { useTimelineActivities } from '@/activities/timeline-activities/hooks/useTimelineActivities';
import { UpsertRecordsInStoreEffect } from '@/object-record/record-store/components/UpsertRecordsInStoreEffect';
import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { StyledWidgetScrollContainer } from '@/ui/layout/components/WidgetContentContainer';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { t } from '@lingui/core/macro';
import { media } from 'twenty-ui/theme/constants.stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  mainContainer: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopStyle: { default: 'none', [media.mobile]: 'solid' },
    borderTopWidth: 1,
  },
  sidePanelPlaceholderWrapper: {
    paddingTop: spacing['--t-spacing-8'],
  },
});

export const TimelineCard = () => {
  const targetRecord = useTargetRecord();
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';
  const {
    timelineActivities,
    firstQueryLoading,
    loadingMore,
    fetchMoreRecords,
    linkedRecords,
  } = useTimelineActivities(targetRecord);

  const isTimelineActivitiesEmpty = timelineActivities.length === 0;

  if (firstQueryLoading === true) {
    return <SkeletonLoader withSubSections />;
  }

  if (isTimelineActivitiesEmpty) {
    const placeholderContent = (
      <EmptyState.Root>
        <AnimatedPlaceholder type="emptyTimeline" />
        <EmptyState.Content>
          <EmptyState.Title>{t`No activity yet`}</EmptyState.Title>
          <EmptyState.Description>
            {t`There is no activity associated with this record.`}
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    );

    return isInSidePanel ? (
      <div {...stylex.props(styles.sidePanelPlaceholderWrapper)}>
        {placeholderContent}
      </div>
    ) : (
      placeholderContent
    );
  }

  return (
    <>
      <UpsertRecordsInStoreEffect records={linkedRecords} />
      <StyledWidgetScrollContainer {...stylex.props(styles.mainContainer)}>
        <EventList
          targetableObject={targetRecord}
          title={t`All`}
          events={timelineActivities ?? []}
        />
        <CustomResolverFetchMoreLoader
          loading={loadingMore}
          onLastRowVisible={fetchMoreRecords}
        />
      </StyledWidgetScrollContainer>
    </>
  );
};
