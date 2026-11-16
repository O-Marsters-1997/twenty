import { isDefined } from 'twenty-shared/utils';

import { CoreWorkflowVersionDiagramEffect } from '@/object-core/workflows/versions/components/CoreWorkflowVersionDiagramEffect';
import { useCoreWorkflowVersion } from '@/object-core/workflows/versions/hooks/useCoreWorkflowVersion';
import { getWorkflowVisualizerComponentInstanceId } from '@/workflow/utils/getWorkflowVisualizerComponentInstanceId';
import { WorkflowDiagramCanvasReadonly } from '@/workflow/workflow-diagram/components/WorkflowDiagramCanvasReadonly';
import { WorkflowVisualizerComponentInstanceContext } from '@/workflow/workflow-diagram/states/contexts/WorkflowVisualizerComponentInstanceContext';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
});

export const CoreWorkflowVersionCard = ({
  coreWorkflowVersionId,
}: {
  coreWorkflowVersionId: string;
}) => {
  const { coreWorkflowVersion } = useCoreWorkflowVersion(coreWorkflowVersionId);

  if (
    !isDefined(coreWorkflowVersion) ||
    !isDefined(coreWorkflowVersion.coreWorkflowId)
  ) {
    return null;
  }

  return (
    <WorkflowVisualizerComponentInstanceContext.Provider
      value={{
        instanceId: getWorkflowVisualizerComponentInstanceId({
          recordId: coreWorkflowVersionId,
        }),
      }}
    >
      <CoreWorkflowVersionDiagramEffect
        workflowId={coreWorkflowVersion.coreWorkflowId}
        coreWorkflowVersionId={coreWorkflowVersionId}
        label={coreWorkflowVersion.label}
        status={coreWorkflowVersion.status}
        createdAt={coreWorkflowVersion.createdAt}
        trigger={coreWorkflowVersion.trigger ?? null}
        steps={coreWorkflowVersion.steps ?? null}
      />
      <div {...stylex.props(styles.container)}>
        <WorkflowDiagramCanvasReadonly
          versionStatus={coreWorkflowVersion.status}
        />
      </div>
    </WorkflowVisualizerComponentInstanceContext.Provider>
  );
};
