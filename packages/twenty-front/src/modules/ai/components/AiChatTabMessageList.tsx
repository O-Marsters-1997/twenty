import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { MarkdownLoadingSkeleton } from '@/ai/components/LazyMarkdownRenderer';
import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';
import { AiChatErrorUnderMessageList } from '@/ai/components/AiChatErrorUnderMessageList';
import { AiChatLastMessageWithStreamingState } from '@/ai/components/AiChatLastMessageWithStreamingState';
import { AiChatNonLastMessageIdsList } from '@/ai/components/AiChatNonLastMessageIdsList';
import { AiChatPendingResponseIndicator } from '@/ai/components/AiChatPendingResponseIndicator';
import { AiChatScrollToBottomButton } from '@/ai/components/AiChatScrollToBottomButton';
import { AiChatThreadInboxStateNotice } from '@/ai/components/AiChatThreadInboxStateNotice';
import { AgentChatScrollToBottomOnDisplayedThreadChangeLayoutEffect } from '@/ai/components/AgentChatScrollToBottomOnDisplayedThreadChangeLayoutEffect';
import { AgentChatStreamingAutoScrollEffect } from '@/ai/components/AgentChatStreamingAutoScrollEffect';
import { agentChatHasMessageSelector } from '@/ai/states/selectors/agentChatHasMessageSelector';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import { useIsWorkspaceSetupChat } from '@/ai/hooks/useIsWorkspaceSetupChat';
import { getAiChatScrollWrapperInstanceId } from '@/ai/utils/getAiChatScrollWrapperInstanceId';
import { WorkspaceSetupChatPreamble } from '@/onboarding/components/WorkspaceSetupChatPreamble';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { ScrollWrapperComponentInstanceContext } from '@/ui/utilities/scroll/states/contexts/ScrollWrapperComponentInstanceContext';
import { Suspense, useContext } from 'react';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  preambleOutsideScrollContainer: {
    padding: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  messageListContent: {
    padding: spacing['--t-spacing-4'],
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  scrollWrapperContainer: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowY: 'auto',
    width: '100%',
  },
});

export const AiChatTabMessageList = () => {
  const isWorkspaceSetupChat = useIsWorkspaceSetupChat();
  const aiChatSurface = useContext(AiChatSurfaceContext);
  const agentChatHasMessage = useAtomStateValue(agentChatHasMessageSelector);

  const scrollWrapperInstanceId = getAiChatScrollWrapperInstanceId(
    aiChatSurface ?? AI_CHAT_SURFACE.SIDE_PANEL,
  );

  if (!agentChatHasMessage) {
    if (!isWorkspaceSetupChat) {
      return null;
    }

    return (
      <div
        {...stylex.props(
          aiChatContentContainerStyles.root,
          styles.preambleOutsideScrollContainer,
        )}
      >
        <WorkspaceSetupChatPreamble />
        <AiChatPendingResponseIndicator />
      </div>
    );
  }

  return (
    <ScrollWrapperComponentInstanceContext.Provider
      value={{ instanceId: scrollWrapperInstanceId }}
    >
      <Suspense
        fallback={
          <div {...stylex.props(styles.scrollWrapperContainer)}>
            <div
              {...stylex.props(
                aiChatContentContainerStyles.root,
                styles.messageListContent,
              )}
            >
              <MarkdownLoadingSkeleton />
            </div>
          </div>
        }
      >
        <div {...stylex.props(styles.scrollWrapperContainer)}>
          <ScrollWrapper componentInstanceId={scrollWrapperInstanceId}>
            <div
              {...stylex.props(
                aiChatContentContainerStyles.root,
                styles.messageListContent,
              )}
            >
              {isWorkspaceSetupChat && <WorkspaceSetupChatPreamble />}
              <AiChatNonLastMessageIdsList />
              <AiChatLastMessageWithStreamingState />
              <AiChatPendingResponseIndicator />
              <AiChatErrorUnderMessageList />
              <AiChatThreadInboxStateNotice />
            </div>
            <AgentChatScrollToBottomOnDisplayedThreadChangeLayoutEffect />
            <AgentChatStreamingAutoScrollEffect />
          </ScrollWrapper>
          <AiChatScrollToBottomButton />
        </div>
      </Suspense>
    </ScrollWrapperComponentInstanceContext.Provider>
  );
};
