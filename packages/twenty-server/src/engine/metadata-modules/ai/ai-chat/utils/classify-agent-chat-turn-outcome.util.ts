import { type AgentChatTurnOutcome } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-turn-outcome.type';

export const classifyAgentChatTurnOutcome = ({
  hasText,
  isAborted,
  isAwaitingUserAnswer,
}: {
  hasText: boolean;
  isAborted: boolean;
  isAwaitingUserAnswer: boolean;
}): AgentChatTurnOutcome => {
  // stopWhen ends the stream on a question, so this is a completed turn, not an abandoned one
  if (isAwaitingUserAnswer) {
    return { kind: 'completed', outcome: 'awaiting_user' };
  }

  if (isAborted) {
    return { kind: 'cancelled', reason: 'user_cancelled' };
  }

  if (hasText) {
    return { kind: 'completed', outcome: 'answered' };
  }

  return { kind: 'failed', failurePhase: 'no_text' };
};

export const resolveSupersededTurnOutcome = (
  outcome: AgentChatTurnOutcome,
): AgentChatTurnOutcome =>
  outcome.kind === 'failed'
    ? outcome
    : { kind: 'cancelled', reason: 'superseded' };
