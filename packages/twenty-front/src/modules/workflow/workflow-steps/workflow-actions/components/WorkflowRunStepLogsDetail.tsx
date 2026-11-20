import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { workflowRunStepLogSchema } from 'twenty-shared/workflow';
import { JsonTree } from 'twenty-ui/components/data-display';
import { IconInfoCircle } from 'twenty-ui/icon';
import { type JsonValue } from 'type-fest';

import { useFlowOrThrow } from '@/workflow/hooks/useFlowOrThrow';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { useWorkflowRunStepLog } from '@/workflow/hooks/useWorkflowRunStepLog';
import { getIsDescendantOfIterator } from '@/workflow/workflow-steps/utils/getIsDescendantOfIterator';
import { WorkflowRunStepAiAgentConversationButton } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/components/WorkflowRunStepAiAgentConversationButton';
import { WorkflowRunStepLogsAiAgentDetail } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/components/WorkflowRunStepLogsAiAgentDetail';
import { WorkflowRunStepLogsEmailDetail } from '@/workflow/workflow-steps/workflow-actions/components/WorkflowRunStepLogsEmailDetail';
import { WorkflowRunStepLogsEntries } from '@/workflow/workflow-steps/workflow-actions/components/WorkflowRunStepLogsEntries';
import { WorkflowRunStepLogsHttpRequestDetail } from '@/workflow/workflow-steps/workflow-actions/http-request-action/components/WorkflowRunStepLogsHttpRequestDetail';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexBasis: 'auto',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    overflowX: 'hidden',
    overflowY: 'scroll',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-4'],
  },
  emptyState: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-sm'],
    textAlign: 'center',
    paddingBottom: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-8'],
  },
  truncatedNotice: {
    background: backgroundTransparent['--t-background-transparent-orange'],
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const WorkflowRunStepLogsDetail = ({ stepId }: { stepId: string }) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();

  const workflowRunId = useWorkflowRunIdOrThrow();
  const flow = useFlowOrThrow();

  const rawStepLog = useWorkflowRunStepLog({ workflowRunId, stepId });

  if (!isDefined(rawStepLog)) {
    return (
      <div {...stylex.props(styles.root)}>
        <div {...stylex.props(styles.emptyState)}>
          <IconInfoCircle size={20} />
          <div>{t`No logs were recorded for this step.`}</div>
        </div>
        <WorkflowRunStepAiAgentConversationButton stepId={stepId} />
      </div>
    );
  }

  const parseResult = workflowRunStepLogSchema.safeParse(rawStepLog);

  if (!parseResult.success) {
    return (
      <div {...stylex.props(styles.root)}>
        <JsonTree
          value={rawStepLog as JsonValue}
          emptyArrayLabel={t`Empty Array`}
          emptyObjectLabel={t`Empty Object`}
          emptyStringLabel={t`[empty string]`}
          arrowButtonCollapsedLabel={t`Expand`}
          arrowButtonExpandedLabel={t`Collapse`}
          onNodeValueClick={copyToClipboard}
        />
      </div>
    );
  }

  const stepLog = parseResult.data;

  const isInsideIteratorLoop = isDefined(flow.steps)
    ? getIsDescendantOfIterator({ stepId, steps: flow.steps })
    : false;

  const renderDetails = () => {
    switch (stepLog.details.type) {
      case 'AI_AGENT':
        return (
          <>
            <WorkflowRunStepAiAgentConversationButton
              stepId={stepId}
              stepLogThreadId={stepLog.details.threadId}
            />
            <WorkflowRunStepLogsAiAgentDetail details={stepLog.details} />
          </>
        );
      case 'HTTP_REQUEST':
        return (
          <WorkflowRunStepLogsHttpRequestDetail details={stepLog.details} />
        );
      case 'EMAIL':
        return <WorkflowRunStepLogsEmailDetail details={stepLog.details} />;
      default:
        return (
          <JsonTree
            value={stepLog.details as JsonValue}
            emptyArrayLabel={t`Empty Array`}
            emptyObjectLabel={t`Empty Object`}
            emptyStringLabel={t`[empty string]`}
            arrowButtonCollapsedLabel={t`Expand`}
            arrowButtonExpandedLabel={t`Collapse`}
            onNodeValueClick={copyToClipboard}
          />
        );
    }
  };

  return (
    <div {...stylex.props(styles.root)}>
      {renderDetails()}

      <WorkflowRunStepLogsEntries
        entries={stepLog.entries}
        onlyLatestIteration={isInsideIteratorLoop}
      />

      {isDefined(stepLog.truncated) && (
        <div {...stylex.props(styles.truncatedNotice)}>
          {t`Some log data was dropped to fit the size limit (${stepLog.truncated.droppedEntries} entries, ${stepLog.truncated.droppedBytes} bytes).`}
        </div>
      )}
    </div>
  );
};
