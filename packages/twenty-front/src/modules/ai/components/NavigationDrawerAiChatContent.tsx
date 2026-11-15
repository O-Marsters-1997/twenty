import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { useLingui } from '@lingui/react/macro';

import { AgentChatThreadsFetchMoreTrigger } from '@/ai/components/AgentChatThreadsFetchMoreTrigger';
import { AiChatSkeletonLoader } from '@/ai/components/internal/AiChatSkeletonLoader';
import { NavigationDrawerAiChatThreadSection } from '@/ai/components/NavigationDrawerAiChatThreadSection';
import { NavigationDrawerAiChatTriageSection } from '@/ai/components/NavigationDrawerAiChatTriageSection';
import { useAiChatThreadClick } from '@/ai/hooks/useAiChatThreadClick';
import { useChatThreads } from '@/ai/hooks/useChatThreads';
import { agentChatRecentThreadsSelector } from '@/ai/states/selectors/agentChatRecentThreadsSelector';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { agentChatFavoriteThreadsSelector } from '@/ai/states/selectors/agentChatFavoriteThreadsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
  },
  threadList: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    width: '100%',
  },
  sectionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
});

const AI_CHAT_RECENTS_NAVIGATION_SECTION_ID = 'AiChatRecents';
const AI_CHAT_FAVORITES_NAVIGATION_SECTION_ID = 'AiChatFavorites';

// Triage opens the inbox page; the drawer itself only lists recent chats
export const NavigationDrawerAiChatContent = () => {
  const { t } = useLingui();
  const isExpanded = useIsNavigationDrawerContentExpanded();

  const isAiChatInboxEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_AI_CHAT_INBOX_ENABLED,
  );
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const { handleThreadClick } = useAiChatThreadClick(
    isAiChatInboxEnabled
      ? { shouldOpenInFullPage: true }
      : { resetNavigationStack: true },
  );

  const { threads, loading } = useChatThreads(agentChatRecentThreadsSelector);
  const agentChatFavoriteThreads = useAtomStateValue(
    agentChatFavoriteThreadsSelector,
  );

  if (loading && threads.length === 0) {
    return (
      <div {...stylex.props(styles.container)}>
        {isExpanded && <AiChatSkeletonLoader />}
      </div>
    );
  }

  const agentChatFavoriteThreadIds = new Set(
    agentChatFavoriteThreads.map(({ id }) => id),
  );
  const recentThreads = threads.filter(
    ({ id }) => !agentChatFavoriteThreadIds.has(id),
  );

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.threadList)}>
        <div {...stylex.props(styles.sectionsContainer)}>
          {isAiChatInboxEnabled && <NavigationDrawerAiChatTriageSection />}
          {agentChatFavoriteThreads.length > 0 && (
            <NavigationDrawerAiChatThreadSection
              sectionId={AI_CHAT_FAVORITES_NAVIGATION_SECTION_ID}
              title={t`Favorites`}
              threads={agentChatFavoriteThreads}
              currentThreadId={currentAiChatThread}
              onThreadClick={handleThreadClick}
            />
          )}
          {recentThreads.length > 0 && (
            <NavigationDrawerAiChatThreadSection
              sectionId={AI_CHAT_RECENTS_NAVIGATION_SECTION_ID}
              title={t`Recent`}
              threads={recentThreads}
              currentThreadId={currentAiChatThread}
              onThreadClick={handleThreadClick}
            />
          )}
        </div>
        <AgentChatThreadsFetchMoreTrigger />
      </div>
    </div>
  );
};
