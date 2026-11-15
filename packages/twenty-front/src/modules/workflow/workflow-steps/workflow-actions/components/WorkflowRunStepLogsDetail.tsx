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
import { spacing, font, background, border } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    overflow: 'hidden scroll',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  emptyState: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-8'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-3'],
    textAlign: 'center',
  },
  truncatedNotice: {
    background: backgroundTransparent['--t-background-transparent-orange'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
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
