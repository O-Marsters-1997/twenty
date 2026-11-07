import { isDefined } from 'twenty-shared/utils';

import { type AgentChatUsageState } from '@/ai/states/agentChatUsageFamilyState';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';

export const getAgentChatUsageFromThread = (
  thread: Pick<
    AgentChatThreadRecord,
    | 'conversationSize'
    | 'contextWindowTokens'
    | 'totalCacheReadTokens'
    | 'totalInputTokens'
    | 'totalOutputTokens'
  >,
): AgentChatUsageState | null => {
  const conversationSize = thread.conversationSize ?? 0;

  if (conversationSize <= 0 || !isDefined(thread.contextWindowTokens)) {
    return null;
  }

  return {
    lastMessage: null,
    cachedInputTokens: thread.totalCacheReadTokens ?? 0,
    conversationSize,
    contextWindowTokens: thread.contextWindowTokens,
    inputTokens: thread.totalInputTokens ?? 0,
    outputTokens: thread.totalOutputTokens ?? 0,
  };
};
