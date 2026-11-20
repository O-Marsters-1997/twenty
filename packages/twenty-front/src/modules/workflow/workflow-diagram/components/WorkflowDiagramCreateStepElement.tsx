import { WorkflowDiagramConnector } from '@/workflow/workflow-diagram/components/WorkflowDiagramConnector';
import { VERTICAL_DISTANCE_BETWEEN_TWO_NODES } from '@/workflow/workflow-diagram/constants/VerticalDistanceBetweenTwoNodes';
import { useStartNodeCreation } from '@/workflow/workflow-diagram/hooks/useStartNodeCreation';
import { type WorkflowDiagramStepNodeData } from '@/workflow/workflow-diagram/types/WorkflowDiagram';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  verticalLineContainer: {
    display: 'flex',
    justifyContent: 'center',
    height: '56px',
    width: '56px',
  },
  labelContainer: {
    position: 'absolute',
    top: '14px',
  },
});

type WorkflowDiagramCreateStepElementProps = {
  data: WorkflowDiagramStepNodeData;
  Label?: React.ReactNode;
};

export const WorkflowDiagramCreateStepElement = ({
  data,
  Label,
}: WorkflowDiagramCreateStepElementProps) => {
  const { startNodeCreation } = useStartNodeCreation();

  const addNode = () => {
    startNodeCreation({
      parentStepId: data.stepId,
      nextStepId: undefined,
      position: {
        x: data.position.x,
        y: data.position.y + VERTICAL_DISTANCE_BETWEEN_TWO_NODES,
      },
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.verticalLineContainer)}>
        <WorkflowDiagramConnector />
      </div>

      {isDefined(Label) && (
        <div {...stylex.props(styles.labelContainer)}>{Label}</div>
      )}

      <IconButton size="sm" aria-label={t`Add a step`} onClick={addNode}>
        <IconPlus />
      </IconButton>
    </div>
  );
};
