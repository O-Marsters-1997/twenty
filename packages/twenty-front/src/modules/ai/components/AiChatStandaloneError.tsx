import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';

import { AiChatErrorRenderer } from '@/ai/components/AiChatErrorRenderer';
import { agentChatErrorFamilyState } from '@/ai/states/agentChatErrorFamilyState';
import { agentChatHasMessageSelector } from '@/ai/states/selectors/agentChatHasMessageSelector';
import { agentChatIsLoadingSelector } from '@/ai/states/selectors/agentChatIsLoadingSelector';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    padding: spacing['--t-spacing-3'],
  },
});

export const AiChatStandaloneError = () => {
  const agentChatIsLoading = useAtomStateValue(agentChatIsLoadingSelector);

  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );
  const agentChatError = useAtomFamilyStateValue(agentChatErrorFamilyState, {
    threadId: agentChatDisplayedThread,
  });

  const agentChatHasMessage = useAtomStateValue(agentChatHasMessageSelector);

  const shouldRender =
    !agentChatHasMessage && isDefined(agentChatError) && !agentChatIsLoading;

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      {...stylex.props(aiChatContentContainerStyles.root, styles.root)}
    >
      <AiChatErrorRenderer error={agentChatError} />
    </div>
  );
};
