import { useInView } from 'react-intersection-observer';
import { isDefined } from 'twenty-shared/utils';

import { useRefreshAgentChatThreads } from '@/ai/hooks/useRefreshAgentChatThreads';
import { agentChatThreadListState } from '@/ai/states/agentChatThreadListState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  fetchMoreTrigger: {
    height: '1px',
    minHeight: '1px',
    width: '100%',
  },
});

export const AgentChatThreadsFetchMoreTrigger = () => {
  const agentChatThreadList = useAtomStateValue(agentChatThreadListState);
  const { fetchMoreAgentChatThreads } = useRefreshAgentChatThreads();
  const { ref } = useInView({
    onChange: (inView) => {
      if (inView) {
        void fetchMoreAgentChatThreads();
      }
    },
  });

  if (!isDefined(agentChatThreadList) || !agentChatThreadList.hasNextPage) {
    return null;
  }

  return <div ref={ref} {...stylex.props(styles.fetchMoreTrigger)} />;
};
