import { getAgentChatUsageFromThread } from '@/ai/utils/getAgentChatUsageFromThread';

const storedThread = {
  conversationSize: 120,
  contextWindowTokens: 1000,
  totalInputTokens: 250,
  totalOutputTokens: 30,
  totalCacheReadTokens: 80,
};

describe('getAgentChatUsageFromThread', () => {
  it('restores cumulative usage without the last message', () => {
    expect(getAgentChatUsageFromThread(storedThread)).toEqual({
      conversationSize: 120,
      contextWindowTokens: 1000,
      inputTokens: 250,
      outputTokens: 30,
      cachedInputTokens: 80,
      lastMessage: null,
    });
  });

  it('does not show a breakdown for an unused thread', () => {
    expect(
      getAgentChatUsageFromThread({ ...storedThread, conversationSize: 0 }),
    ).toBeNull();
  });
});
