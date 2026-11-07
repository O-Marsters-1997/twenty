import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';
export type AgentChatLastMessageUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type AgentChatUsageState = {
  lastMessage: AgentChatLastMessageUsage | null;
  cachedInputTokens: number;
  conversationSize: number;
  contextWindowTokens: number;
  inputTokens: number;
  outputTokens: number;
};

export const agentChatUsageFamilyState = createAtomFamilyState<
  AgentChatUsageState | null,
  { threadId: string | null }
>({
  key: 'agentChatUsageFamilyState',
  defaultValue: null,
});
