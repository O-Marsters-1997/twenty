import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { MarkdownLoadingSkeleton } from '@/ai/components/LazyMarkdownRenderer';
import { StyledAiChatContentContainer } from '@/ai/components/StyledAiChatContentContainer';
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
import { styled } from '@linaria/react';
import { Suspense, useContext } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  scrollWrapperContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    overflowY: 'auto',
    position: 'relative',
    width: '100%',
  },
});

const StyledPreambleOutsideScrollContainer = styled(
  StyledAiChatContentContainer,
)`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledMessageListContent = styled(StyledAiChatContentContainer)`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]};
`;

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
      <StyledPreambleOutsideScrollContainer>
        <WorkspaceSetupChatPreamble />
        <AiChatPendingResponseIndicator />
      </StyledPreambleOutsideScrollContainer>
    );
  }

  return (
    <ScrollWrapperComponentInstanceContext.Provider
      value={{ instanceId: scrollWrapperInstanceId }}
    >
      <Suspense
        fallback={
          <div {...stylex.props(styles.scrollWrapperContainer)}>
            <StyledMessageListContent>
              <MarkdownLoadingSkeleton />
            </StyledMessageListContent>
          </div>
        }
      >
        <div {...stylex.props(styles.scrollWrapperContainer)}>
          <ScrollWrapper componentInstanceId={scrollWrapperInstanceId}>
            <StyledMessageListContent>
              {isWorkspaceSetupChat && <WorkspaceSetupChatPreamble />}
              <AiChatNonLastMessageIdsList />
              <AiChatLastMessageWithStreamingState />
              <AiChatPendingResponseIndicator />
              <AiChatErrorUnderMessageList />
              <AiChatThreadInboxStateNotice />
            </StyledMessageListContent>
            <AgentChatScrollToBottomOnDisplayedThreadChangeLayoutEffect />
            <AgentChatStreamingAutoScrollEffect />
          </ScrollWrapper>
          <AiChatScrollToBottomButton />
        </div>
      </Suspense>
    </ScrollWrapperComponentInstanceContext.Provider>
  );
};
