import type { WorkflowRunStepStatus } from '@/workflow/types/Workflow';
import { getWorkflowDiagramColors } from '@/workflow/workflow-diagram/utils/getWorkflowDiagramColors';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 1,
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    display: '-webkit-box',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textOverflow: 'ellipsis',
  },
  color: (color: string) => ({ color }),
});

export const WorkflowNodeTitle = ({
  highlight,
  runStatus,
  selected,
  children,
}: {
  highlight?: boolean;
  runStatus?: WorkflowRunStepStatus;
  selected: boolean;
  children?: ReactNode;
}) => {
  const colors = getWorkflowDiagramColors({ runStatus });
  const titleColor =
    highlight === true || selected
      ? colors.selected.titleColor
      : colors.unselected.titleColor;

  return (
    <div {...stylex.props(styles.root, styles.color(titleColor))}>
      {children}
    </div>
  );
};
