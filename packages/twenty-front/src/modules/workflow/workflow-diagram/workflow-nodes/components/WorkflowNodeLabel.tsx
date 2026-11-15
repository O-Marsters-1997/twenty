import type { WorkflowRunStepStatus } from '@/workflow/types/Workflow';
import { getWorkflowDiagramColors } from '@/workflow/workflow-diagram/utils/getWorkflowDiagramColors';
import * as stylex from '@stylexjs/stylex';
import { fontWeight } from 'twenty-ui/theme/tokens.stylex';

type WorkflowNodeLabelProps = {
  runStatus?: WorkflowRunStepStatus;
  selected: boolean;
  children?: React.ReactNode;
};

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 0,
  },
  label: (color: string) => ({
    color,
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  }),
});

export const WorkflowNodeLabel = ({
  runStatus,
  selected,
  children,
}: WorkflowNodeLabelProps) => {
  const colors = getWorkflowDiagramColors({ runStatus });
  const labelColor = selected ? colors.selected.color : colors.unselected.color;

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.label(labelColor))}>{children}</div>
    </div>
  );
};
