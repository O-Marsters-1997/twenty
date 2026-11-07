import { AgentChatMessagesFetchEffect } from '@/ai/components/AgentChatMessagesFetchEffect';
import { AgentChatPrepromptEffect } from '@/ai/components/AgentChatPrepromptEffect';
import { AgentChatStreamSubscriptionEffect } from '@/ai/components/AgentChatStreamSubscriptionEffect';
import { agentChatUISessionStartTimeState } from '@/ai/states/agentChatUISessionStartTimeState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';

export const AgentChatRuntimeEffects = () => {
  // The session starts the first time the chat is opened
  const agentChatUISessionStartTime = useAtomStateValue(
    agentChatUISessionStartTimeState,
  );

  if (!isDefined(agentChatUISessionStartTime)) {
    return null;
  }

  return (
    <>
      <AgentChatMessagesFetchEffect />
      <AgentChatStreamSubscriptionEffect />
      <AgentChatPrepromptEffect />
    </>
  );
};
