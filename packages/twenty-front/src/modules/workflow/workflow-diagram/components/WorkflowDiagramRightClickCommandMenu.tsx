import { ListItemButton } from 'twenty-ui/components/navigation';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useCloseRightClickMenu } from '@/workflow/workflow-diagram/hooks/useCloseRightClickMenu';
import { useStartNodeCreation } from '@/workflow/workflow-diagram/hooks/useStartNodeCreation';
import { useWorkflowDiagramScreenToFlowPosition } from '@/workflow/workflow-diagram/hooks/useWorkflowDiagramScreenToFlowPosition';
import { workflowDiagramRightClickMenuPositionState } from '@/workflow/workflow-diagram/states/workflowDiagramRightClickMenuPositionState';
import { useTidyUp } from '@/workflow/workflow-version/hooks/useTidyUp';
import * as stylex from '@stylexjs/stylex';
import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus, IconReorder } from 'twenty-ui/icon';
import { WorkflowDiagramRightClickCommandMenuClickOutsideEffect } from './WorkflowDiagramRightClickCommandMenuClickOutsideEffect';
import {
  background,
  boxShadow,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    background: background['--t-background-primary'],
    borderRadius: spacing['--t-spacing-2'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
    padding: spacing['--t-spacing-1'],
    position: 'absolute',
    width: '200px',
  },
  position: (x: number, y: number) => ({ left: `${x}px`, top: `${y}px` }),
});

export const WorkflowDiagramRightClickCommandMenu = () => {
  const { t } = useLingui();
  const rightClickCommandMenuRef = useRef<HTMLDivElement>(null);

  const { workflowDiagramScreenToFlowPosition } =
    useWorkflowDiagramScreenToFlowPosition();

  const { startNodeCreation } = useStartNodeCreation();

  const { closeRightClickMenu } = useCloseRightClickMenu();

  const workflowDiagramRightClickMenuPosition = useAtomComponentStateValue(
    workflowDiagramRightClickMenuPositionState,
  );

  const { tidyUp } = useTidyUp();

  const handleReorderWorkflowDiagram = async () => {
    await tidyUp();
    closeRightClickMenu();
  };

  const addNode = () => {
    const position = workflowDiagramScreenToFlowPosition(
      workflowDiagramRightClickMenuPosition,
    );
    startNodeCreation({
      parentStepId: undefined,
      nextStepId: undefined,
      position,
    });
  };

  if (!isDefined(workflowDiagramRightClickMenuPosition)) {
    return;
  }

  return (
    <>
      <div
        ref={rightClickCommandMenuRef}
        {...stylex.props(
          styles.root,
          styles.position(
            workflowDiagramRightClickMenuPosition.x,
            workflowDiagramRightClickMenuPosition.y,
          ),
        )}
      >
        <ListItemButton
          startIcon={<IconPlus />}
          onClick={addNode}
        >{t`Add node`}</ListItemButton>
        <ListItemButton
          startIcon={<IconReorder />}
          onClick={handleReorderWorkflowDiagram}
        >{t`Tidy up workflow`}</ListItemButton>
      </div>
      <WorkflowDiagramRightClickCommandMenuClickOutsideEffect
        rightClickCommandMenuRef={rightClickCommandMenuRef}
      />
    </>
  );
};
