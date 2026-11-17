import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { type ReactNode } from 'react';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatMessagesFamilyState } from '@/ai/states/agentChatMessagesFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useCanRetryCurrentAiChatTurn } from '@/ai/hooks/useCanRetryCurrentAiChatTurn';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={jotaiStore}>{children}</Provider>
);

describe('Chat execution controls', () => {
  beforeEach(() => {
    resetJotaiStore();
    jotaiStore.set(agentChatDisplayedThreadState.atom, 'thread');
    jotaiStore.set(currentAiChatThreadState.atom, 'thread');
    jotaiStore.set(currentWorkspaceMemberState.atom, {
      id: 'bob',
    } as never);
  });

  it.each([
    ['bob', true],
    ['alice', false],
    [null, false],
  ])(
    'uses the saved sender (%s) for retries',
    (senderWorkspaceMemberId, expected) => {
      jotaiStore.set(
        agentChatMessagesFamilyState.atomFamily({ threadId: 'thread' }),
        [
          {
            id: 'message',
            role: 'user',
            parts: [],
            metadata: {
              createdAt: '2026-09-22T00:00:00.000Z',
              senderWorkspaceMemberId,
            },
          },
          { id: 'assistant', role: 'assistant', parts: [] },
          {
            id: 'queued',
            role: 'user',
            status: 'queued',
            parts: [],
            metadata: {
              createdAt: '2026-09-22T00:00:00.000Z',
              senderWorkspaceMemberId: 'alice',
            },
          },
        ],
      );
      const { result } = renderHook(() => useCanRetryCurrentAiChatTurn(), {
        wrapper,
      });
      expect(result.current).toBe(expected);
    },
  );
});
