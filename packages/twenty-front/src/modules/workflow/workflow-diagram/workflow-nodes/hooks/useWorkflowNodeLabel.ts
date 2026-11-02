import { type WorkflowDiagramStepNodeData } from '@/workflow/workflow-diagram/types/WorkflowDiagram';
import { t } from '@lingui/core/macro';
import { getActionHeaderTypeOrThrow } from '@/workflow/workflow-steps/workflow-actions/utils/getActionHeaderTypeOrThrow';

export const useWorkflowNodeLabel = (
  data: WorkflowDiagramStepNodeData,
): string =>
  data.nodeType === 'action'
    ? t(getActionHeaderTypeOrThrow(data.actionType))
    : t`Trigger`;
