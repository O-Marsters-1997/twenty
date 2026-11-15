import type { WorkflowRunStepStatus } from '@/workflow/types/Workflow';
import { getWorkflowDiagramColors } from '@/workflow/workflow-diagram/utils/getWorkflowDiagramColors';
import { Handle, Position, type HandleProps } from '@xyflow/react';
import { useMemo, type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

const HANDLE_SCALE_ON_HOVER = 1.5;

type WorkflowDiagramHandleSourceProps = {
  id: string;
  type: HandleProps['type'];
  position: Position;
  selected: boolean;
  hovered?: boolean;
  disableHoverEffect?: boolean;
  runStatus?: WorkflowRunStepStatus;
};

export const WorkflowDiagramHandleSource = ({
  id,
  type,
  position,
  selected,
  hovered,
  disableHoverEffect,
  runStatus,
}: WorkflowDiagramHandleSourceProps) => {
  const dynamicStyles = useMemo(() => {
    const isRight = position === Position.Right;
    const transform = isRight ? 'translate(50%, -50%)' : 'translate(-50%, 50%)';
    // oxlint-disable-next-line lingui/no-unlocalized-strings
    const transformOrigin = isRight ? 'top right' : 'bottom left';

    let bg: string;
    let borderColor: string;

    if (selected) {
      const colors = getWorkflowDiagramColors({ runStatus });
      bg = colors.selected.background;
      borderColor = colors.selected.borderColor;
    } else {
      bg = themeCssVariables.background.primary;
      borderColor =
        hovered && disableHoverEffect !== true
          ? themeCssVariables.font.color.light
          : themeCssVariables.border.color.strong;
    }

    const styles: Record<string, string> = {
      '--handle-opacity': type === 'target' ? '0' : '1',
      '--handle-bg': bg,
      '--handle-border-color': borderColor,
      '--handle-transform': transform,
      '--handle-transform-origin': transformOrigin,
    };

    if (disableHoverEffect !== true) {
      const hoverColors = getWorkflowDiagramColors({});
      styles['--handle-hover-bg'] = hoverColors.selected.background;
      styles['--handle-hover-border-color'] = hoverColors.selected.borderColor;
      styles['--handle-hover-transform'] =
        `scale(${HANDLE_SCALE_ON_HOVER}) ${transform}`;
    }

    return styles as CSSProperties;
  }, [position, selected, hovered, disableHoverEffect, runStatus, type]);

  return (
    <div data-workflow-handle-source>
      <Handle id={id} type={type} position={position} style={dynamicStyles} />
    </div>
  );
};
