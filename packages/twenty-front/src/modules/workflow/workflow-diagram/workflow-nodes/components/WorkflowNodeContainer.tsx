import type { WorkflowRunStepStatus } from '@/workflow/types/Workflow';
import { getWorkflowDiagramColors } from '@/workflow/workflow-diagram/utils/getWorkflowDiagramColors';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

const TARGET_HANDLE_SPACING = 32;

type WorkflowNodeContainerProps = {
  runStatus?: WorkflowRunStepStatus;
  isConnectable?: boolean;
  selected: boolean;
  targetHandleCount?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  'data-click-outside-id'?: string;
  children?: ReactNode;
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    maxWidth: '240px',
    padding: spacing['--t-spacing-2'],
    position: 'relative',
    transitionDuration: '0.1s',
    transitionProperty: 'border-color',
  },
  colors: (
    background: string,
    borderColor: string,
    hoverBackground: string,
    hoverBorderColor: string,
    minWidth: number,
  ) => ({
    background: { default: background, ':hover': hoverBackground },
    borderColor: { default: borderColor, ':hover': hoverBorderColor },
    minWidth: `${minWidth}px`,
  }),
});

export const WorkflowNodeContainer = ({
  runStatus,
  isConnectable,
  selected,
  targetHandleCount = 0,
  onClick,
  onMouseEnter,
  onMouseLeave,
  'data-click-outside-id': dataClickOutsideId,
  children,
}: WorkflowNodeContainerProps) => {
  const colors = getWorkflowDiagramColors({ runStatus });
  const current = selected ? colors.selected : colors.unselected;
  const hoverBackground = `linear-gradient(0deg, ${themeCssVariables.background.transparent.lighter} 0%, ${themeCssVariables.background.transparent.lighter} 100%), ${current.background}`;
  const hoverBorderColor =
    isConnectable === true ? themeCssVariables.color.blue : current.borderColor;

  return (
    <div
      {...stylex.props(
        styles.root,
        styles.colors(
          current.background,
          current.borderColor,
          hoverBackground,
          hoverBorderColor,
          Math.max(44, (targetHandleCount + 1) * TARGET_HANDLE_SPACING),
        ),
      )}
      data-click-outside-id={dataClickOutsideId}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};
