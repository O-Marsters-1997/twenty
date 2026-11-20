import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';

import { AiChatAskCard } from '@/ai/components/AiChatAskCard';
import { useAgentChatPendingToolCalls } from '@/ai/hooks/useAgentChatPendingToolCalls';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  gate: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  stepper: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: '0',
  },
  stepperLabel: {
    flex: '1',
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type AiChatPendingAskGateProps = {
  children: ReactNode;
};

type RequestSelection = {
  threadId: string | null;
  toolCallId: string | null;
  index: number;
  // the requests pending when one was picked, to tell a later batch from this one
  batchToolCallIds: string[];
};

// The agent resumes once every paused call is answered. Each call is answered on its own, in any
// order, and every card stays mounted so what is typed in one survives going to another.
export const AiChatPendingAskGate = ({
  children,
}: AiChatPendingAskGateProps) => {
  const { t } = useLingui();
  const pendingToolCalls = useAgentChatPendingToolCalls();
  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );
  const [selection, setSelection] = useState<RequestSelection>({
    threadId: null,
    toolCallId: null,
    index: 0,
    batchToolCallIds: [],
  });

  if (pendingToolCalls.length === 0) {
    return children;
  }

  const requestCount = pendingToolCalls.length;
  const selectedIndex = pendingToolCalls.findIndex(
    (pendingToolCall) => pendingToolCall.toolCallId === selection.toolCallId,
  );
  // an answered request leaves the list, so the one taking its place is shown
  // a selection made in another conversation or for an earlier batch does not carry over, so
  // each new set of requests opens on its oldest one
  const isSameBatch =
    selection.threadId === agentChatDisplayedThread &&
    pendingToolCalls.some((pendingToolCall) =>
      selection.batchToolCallIds.includes(pendingToolCall.toolCallId),
    );
  const previousIndex = isSameBatch ? selection.index : 0;
  const currentIndex =
    selectedIndex >= 0
      ? selectedIndex
      : Math.min(previousIndex, requestCount - 1);
  const requestNumber = currentIndex + 1;

  const selectRequest = (index: number) =>
    setSelection({
      threadId: agentChatDisplayedThread,
      toolCallId: pendingToolCalls[index].toolCallId,
      index,
      batchToolCallIds: pendingToolCalls.map(
        (pendingToolCall) => pendingToolCall.toolCallId,
      ),
    });

  return (
    <div {...stylex.props(styles.gate)}>
      {requestCount > 1 && (
        <div {...stylex.props(styles.stepper)}>
          <span {...stylex.props(styles.stepperLabel)}>
            {t`Request ${requestNumber} of ${requestCount}`}
          </span>
          <LightIconButton
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => selectRequest(currentIndex - 1)}
            aria-label={t`Previous request`}
          >
            <IconChevronLeft />
          </LightIconButton>
          <LightIconButton
            size="sm"
            disabled={currentIndex === requestCount - 1}
            onClick={() => selectRequest(currentIndex + 1)}
            aria-label={t`Next request`}
          >
            <IconChevronRight />
          </LightIconButton>
        </div>
      )}
      {pendingToolCalls.map((pendingToolCall, index) => (
        <div key={pendingToolCall.toolCallId} hidden={index !== currentIndex}>
          <AiChatAskCard pendingToolCall={pendingToolCall} />
        </div>
      ))}
    </div>
  );
};
