import { isDefined } from 'twenty-shared/utils';
import { getActionIconStrokeOrThrow } from '@/workflow/workflow-steps/workflow-actions/utils/getActionIconStrokeOrThrow';
import { type WorkflowDiagramStepNodeData } from '@/workflow/workflow-diagram/types/WorkflowDiagram';
import { getWorkflowNodeIconKey } from '@/workflow/workflow-diagram/utils/getWorkflowNodeIconKey';
import { getActionIconColorOrThrow } from '@/workflow/workflow-steps/workflow-actions/utils/getActionIconColorOrThrow';
import { getTriggerIconColor } from '@/workflow/workflow-trigger/utils/getTriggerIconColor';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

export const WorkflowDiagramStepNodeIcon = ({
  data,
}: {
  data: WorkflowDiagramStepNodeData;
}) => {
  const theme = useTheme();
  const { getIcon } = useIcons();
  const Icon = getIcon(getWorkflowNodeIconKey(data));

  if (data.nodeType === 'action' && data.actionType === 'EMPTY') {
    return null;
  }

  const stroke =
    data.nodeType === 'action'
      ? getActionIconStrokeOrThrow(data.actionType)
      : undefined;

  return (
    <Icon
      size={theme.icon.size.md}
      color={
        data.nodeType === 'trigger'
          ? getTriggerIconColor(data.triggerType)
          : getActionIconColorOrThrow(data.actionType)
      }
      stroke={isDefined(stroke) ? theme.icon.stroke[stroke] : undefined}
    />
  );
};
