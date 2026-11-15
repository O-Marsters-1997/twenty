import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { useSidePanelWorkflowNavigation } from '@/side-panel/pages/workflow/hooks/useSidePanelWorkflowNavigation';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useWorkflowRun } from '@/workflow/hooks/useWorkflowRun';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { workflowVisualizerWorkflowIdComponentState } from '@/workflow/states/workflowVisualizerWorkflowIdComponentState';
import { type WorkflowRunStepStatus } from '@/workflow/types/Workflow';
import { WORKFLOW_DIAGRAM_STEP_NODE_BASE_CLICK_OUTSIDE_ID } from '@/workflow/workflow-diagram/constants/WorkflowDiagramStepNodeClickOutsideId';
import { workflowSelectedNodeComponentState } from '@/workflow/workflow-diagram/states/workflowSelectedNodeComponentState';
import { type WorkflowRunDiagramStepNodeData } from '@/workflow/workflow-diagram/types/WorkflowDiagram';
import { getWorkflowDiagramColors } from '@/workflow/workflow-diagram/utils/getWorkflowDiagramColors';
import { getWorkflowNodeIconKey } from '@/workflow/workflow-diagram/utils/getWorkflowNodeIconKey';
import { WorkflowDiagramHandleSource } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowDiagramHandleSource';
import { WorkflowDiagramHandleTarget } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowDiagramHandleTarget';
import { WorkflowDiagramStepNodeIcon } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowDiagramStepNodeIcon';
import { WorkflowNodeContainer } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowNodeContainer';
import { WorkflowNodeIconContainer } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowNodeIconContainer';
import { WorkflowNodeLabel } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowNodeLabel';
import { WorkflowNodeRightPart } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowNodeRightPart';
import { WorkflowNodeTitle } from '@/workflow/workflow-diagram/workflow-nodes/components/WorkflowNodeTitle';
import { WORKFLOW_DIAGRAM_NODE_DEFAULT_SOURCE_HANDLE_ID } from '@/workflow/workflow-diagram/workflow-nodes/constants/WorkflowDiagramNodeDefaultSourceHandleId';
import { useWorkflowNodeLabel } from '@/workflow/workflow-diagram/workflow-nodes/hooks/useWorkflowNodeLabel';
import { getNodeIterationCount } from '@/workflow/workflow-diagram/workflow-nodes/utils/getNodeIterationCount';
import { Position } from '@xyflow/react';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { StepStatus } from 'twenty-shared/workflow';
import { IconCheck, IconX, useIcons } from 'twenty-ui/icon';
import { Loader } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nodeLabelWithCounterPart: {
    alignItems: 'center',
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    columnGap: spacing['--t-spacing-2'],
    display: 'flex',
    height: '14px',
    justifyContent: 'space-between',
  },
  statusIconsContainer: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'flex-end',
  },
  colorIcon: (backgroundColor: string) => ({
    alignItems: 'center',
    backgroundColor,
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    width: '14px',
  }),
  iterationCounter: (color: string) => ({
    color,
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  }),
  rightPartContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export const WorkflowRunDiagramStepNode = ({
  id,
  data,
}: {
  id: string;
  data: WorkflowRunDiagramStepNodeData;
}) => {
  const { getIcon } = useIcons();

  const workflowVisualizerWorkflowId = useAtomComponentStateValue(
    workflowVisualizerWorkflowIdComponentState,
  );
  const workflowRunId = useWorkflowRunIdOrThrow();

  const [workflowSelectedNode, setWorkflowSelectedNode] = useAtomComponentState(
    workflowSelectedNodeComponentState,
  );

  const selected = workflowSelectedNode === id;

  const { openWorkflowRunViewStepInSidePanel } =
    useSidePanelWorkflowNavigation();

  const { commandMenuContextApi } = useContext(CommandMenuContext);
  const isInSidePanel = commandMenuContextApi.isInSidePanel;

  const setSidePanelNavigationStack = useSetAtomState(
    sidePanelNavigationStackState,
  );

  const workflowRun = useWorkflowRun({ workflowRunId });

  const stepInfo = workflowRun?.state?.stepInfos[data.stepId];

  const iterationCount =
    data.nodeType === 'action' && isDefined(stepInfo)
      ? getNodeIterationCount({ stepInfo })
      : 0;

  const nodeLabel = useWorkflowNodeLabel(data);

  const handleClick = () => {
    if (!isDefined(workflowVisualizerWorkflowId)) {
      throw new Error('Workflow ID must be defined');
    }

    if (!isInSidePanel) {
      setSidePanelNavigationStack([]);
    }

    setWorkflowSelectedNode(id);

    openWorkflowRunViewStepInSidePanel({
      workflowId: workflowVisualizerWorkflowId,
      workflowRunId,
      title: data.name,
      icon: getIcon(getWorkflowNodeIconKey(data)),
      workflowSelectedNode: id,
      stepExecutionStatus: data.runStatus,
    });
  };

  return (
    <>
      <WorkflowNodeContainer
        data-click-outside-id={WORKFLOW_DIAGRAM_STEP_NODE_BASE_CLICK_OUTSIDE_ID}
        runStatus={data.runStatus}
        onClick={handleClick}
        selected={selected}
        targetHandleCount={data.targetHandleIds?.length}
      >
        <WorkflowDiagramHandleTarget targetHandleIds={data.targetHandleIds} />
        <WorkflowNodeIconContainer>
          <WorkflowDiagramStepNodeIcon data={data} />
        </WorkflowNodeIconContainer>

        <WorkflowNodeRightPart>
          <div {...stylex.props(styles.nodeLabelWithCounterPart)}>
            <WorkflowNodeLabel runStatus={data.runStatus} selected={selected}>
              {nodeLabel}
            </WorkflowNodeLabel>

            <div {...stylex.props(styles.rightPartContainer)}>
              {iterationCount > 0 && (
                <div
                  {...stylex.props(
                    styles.iterationCounter(
                      getWorkflowDiagramColors({ runStatus: data.runStatus })
                        .unselected.color,
                    ),
                  )}
                >
                  {iterationCount}
                </div>
              )}

              {(data.runStatus === StepStatus.SUCCESS ||
                data.runStatus === StepStatus.STOPPED) && (
                <div {...stylex.props(styles.statusIconsContainer)}>
                  <div
                    {...stylex.props(
                      styles.colorIcon(themeCssVariables.tag.background.turquoise),
                    )}
                  >
                    <IconCheck
                      color={themeCssVariables.tag.text.turquoise}
                      size={14}
                    />
                  </div>
                </div>
              )}

              {(data.runStatus === StepStatus.FAILED ||
                data.runStatus === StepStatus.FAILED_SAFELY) && (
                <div {...stylex.props(styles.statusIconsContainer)}>
                  <div
                    {...stylex.props(
                      styles.colorIcon(themeCssVariables.tag.background.red),
                    )}
                  >
                    <IconX color={themeCssVariables.tag.text.red} size={14} />
                  </div>
                </div>
              )}

              {(data.runStatus === StepStatus.RUNNING ||
                data.runStatus === StepStatus.PENDING) && (
                <div {...stylex.props(styles.statusIconsContainer)}>
                  <Loader color="yellow" />
                </div>
              )}
            </div>
          </div>

          <WorkflowNodeTitle runStatus={data.runStatus} selected={selected}>
            {data.name}
          </WorkflowNodeTitle>
        </WorkflowNodeRightPart>
      </WorkflowNodeContainer>

      <WorkflowDiagramHandleSource
        id={WORKFLOW_DIAGRAM_NODE_DEFAULT_SOURCE_HANDLE_ID}
        type="source"
        position={Position.Bottom}
        disableHoverEffect
        selected={selected}
        runStatus={data.runStatus}
      />

      {isDefined(data.rightHandleOptions) && (
        <WorkflowDiagramHandleSource
          id={data.rightHandleOptions.id}
          type="source"
          position={Position.Right}
          disableHoverEffect
          selected={selected}
          runStatus={data.runStatus}
        />
      )}
    </>
  );
};
