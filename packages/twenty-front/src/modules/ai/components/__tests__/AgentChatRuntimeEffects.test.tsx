import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { Temporal } from 'temporal-polyfill';

import { AgentChatRuntimeEffects } from '@/ai/components/AgentChatRuntimeEffects';
import { agentChatUISessionStartTimeState } from '@/ai/states/agentChatUISessionStartTimeState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

jest.mock('@/ai/components/AgentChatMessagesFetchEffect', () => ({
  AgentChatMessagesFetchEffect: () => null,
}));
jest.mock('@/ai/components/AgentChatStreamSubscriptionEffect', () => ({
  AgentChatStreamSubscriptionEffect: () => (
    <div data-testid="stream-subscription" />
  ),
}));
jest.mock('@/ai/components/AgentChatPrepromptEffect', () => ({
  AgentChatPrepromptEffect: () => null,
}));

const renderRuntimeEffects = () =>
  render(
    <JotaiProvider store={jotaiStore}>
      <AgentChatRuntimeEffects />
    </JotaiProvider>,
  );

describe('AgentChatRuntimeEffects', () => {
  beforeEach(() => {
    jotaiStore.set(
      agentChatUISessionStartTimeState.atom,
      Temporal.Now.instant(),
    );
    jotaiStore.set(currentWorkspaceState.atom, null);
  });

  it('should run the chat runtime once the chat has been opened', () => {
    renderRuntimeEffects();

    expect(screen.queryByTestId('stream-subscription')).not.toBeNull();
  });
});
