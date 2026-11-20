import { ActivityList } from '@/activities/components/ActivityList';
import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { EmailThreadPreview } from '@/activities/emails/components/EmailThreadPreview';
import { EmptyInboxPlaceholder } from '@/activities/emails/components/EmptyInboxPlaceholder';
import { StyledWidgetContentContainer } from '@/ui/layout/components/WidgetContentContainer';
import * as stylex from '@stylexjs/stylex';
import { Section } from 'twenty-ui/components/layout';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type TimelineThread } from '~/generated/graphql';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-6'],
    overflow: 'hidden',
  },
  section: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
});

type EmailsCardContentProps = {
  firstQueryLoading: boolean;
  isFetchingMore: boolean;
  onLastRowVisible: () => Promise<void>;
  timelineThreads: TimelineThread[] | undefined;
};

export const EmailsCardContent = ({
  firstQueryLoading,
  isFetchingMore,
  onLastRowVisible,
  timelineThreads,
}: EmailsCardContentProps) => {
  if (firstQueryLoading) {
    return <SkeletonLoader />;
  }

  if (!timelineThreads?.length) {
    return (
      <StyledWidgetContentContainer {...stylex.props(styles.container)}>
        <EmptyInboxPlaceholder />
      </StyledWidgetContentContainer>
    );
  }

  return (
    <StyledWidgetContentContainer {...stylex.props(styles.container)}>
      <Section.Root xstyle={styles.section}>
        <ActivityList isScrollable>
          {timelineThreads.map((thread) => (
            <EmailThreadPreview key={thread.id} thread={thread} />
          ))}
          <CustomResolverFetchMoreLoader
            loading={isFetchingMore}
            onLastRowVisible={onLastRowVisible}
          />
        </ActivityList>
      </Section.Root>
    </StyledWidgetContentContainer>
  );
};
