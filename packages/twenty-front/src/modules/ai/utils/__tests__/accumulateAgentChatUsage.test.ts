import { accumulateAgentChatUsage } from '@/ai/utils/accumulateAgentChatUsage';

const messageUsage = {
  inputTokens: 100,
  outputTokens: 20,
  cachedInputTokens: 50,
  conversationSize: 120,
};

describe('accumulateAgentChatUsage', () => {
  it('starts totals from the first message usage', () => {
    expect(
      accumulateAgentChatUsage(null, messageUsage, {
        contextWindowTokens: 200_000,
      }),
    ).toEqual({
      lastMessage: {
        inputTokens: 100,
        outputTokens: 20,
        cachedInputTokens: 50,
      },
      cachedInputTokens: 50,
      conversationSize: 120,
      contextWindowTokens: 200_000,
      inputTokens: 100,
      outputTokens: 20,
    });
  });

  it('sums totals and takes the latest message, conversation size and context window', () => {
    const previousUsage = accumulateAgentChatUsage(null, messageUsage, {
      contextWindowTokens: 200_000,
    });

    expect(
      accumulateAgentChatUsage(
        previousUsage,
        {
          inputTokens: 300,
          outputTokens: 40,
          cachedInputTokens: 10,
          conversationSize: 460,
        },
        { contextWindowTokens: 1_000_000 },
      ),
    ).toEqual({
      lastMessage: {
        inputTokens: 300,
        outputTokens: 40,
        cachedInputTokens: 10,
      },
      cachedInputTokens: 60,
      conversationSize: 460,
      contextWindowTokens: 1_000_000,
      inputTokens: 400,
      outputTokens: 60,
    });
  });
});
