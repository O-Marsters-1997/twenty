import { AiChatErrorRenderer } from '@/ai/components/AiChatErrorRenderer';
import { AGENT_MESSAGE_ROLE } from '@/ai/constants/AgentMessageRole';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatErrorFamilyState } from '@/ai/states/agentChatErrorFamilyState';
import { agentChatIsStreamingFamilyState } from '@/ai/states/agentChatIsStreamingFamilyState';
import { agentChatMessageFamilySelector } from '@/ai/states/selectors/agentChatMessageFamilySelector';
import { agentChatMessageIdsSelector } from '@/ai/states/selectors/agentChatMessageIdsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  errorWrapper: {
    paddingTop: spacing['--t-spacing-3'],
  },
});

export const AiChatErrorUnderMessageList = () => {
  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );
  const agentChatError = useAtomFamilyStateValue(agentChatErrorFamilyState, {
    threadId: agentChatDisplayedThread,
  });
  const agentChatIsStreaming = useAtomFamilyStateValue(
    agentChatIsStreamingFamilyState,
    { threadId: agentChatDisplayedThread },
  );

  const agentChatMessageIds = useAtomStateValue(agentChatMessageIdsSelector);

  const lastMessageId = agentChatMessageIds.at(-1);
  const agentChatMessage = useAtomFamilySelectorValue(
    agentChatMessageFamilySelector,
    { messageId: lastMessageId },
  );

  const showError =
    agentChatError &&
    !agentChatIsStreaming &&
    agentChatMessage?.role === AGENT_MESSAGE_ROLE.USER;

  if (!showError) {
    return null;
  }

  return (
    <div {...stylex.props(styles.errorWrapper)}>
      <AiChatErrorRenderer error={agentChatError} />
    </div>
  );
};
