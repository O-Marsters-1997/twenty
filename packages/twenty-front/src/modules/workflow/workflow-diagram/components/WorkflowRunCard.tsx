import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { getWorkflowVisualizerComponentInstanceId } from '@/workflow/utils/getWorkflowVisualizerComponentInstanceId';
import { WorkflowRunSSESubscribeEffect } from '@/workflow/workflow-diagram/components/WorkflowRunSSESubscribeEffect';
import { WorkflowRunVisualizer } from '@/workflow/workflow-diagram/components/WorkflowRunVisualizer';
import { WorkflowRunVisualizerEffect } from '@/workflow/workflow-diagram/components/WorkflowRunVisualizerEffect';
import { WorkflowRunVisualizerComponentInstanceContext } from '@/workflow/workflow-diagram/states/contexts/WorkflowRunVisualizerComponentInstanceContext';
import { WorkflowVisualizerComponentInstanceContext } from '@/workflow/workflow-diagram/states/contexts/WorkflowVisualizerComponentInstanceContext';
import { Suspense, useId } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
const styles = stylex.create({
  loadingSkeletonContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
    width: '100%',
  },
});

const LoadingSkeleton = () => {
  return (
    <div {...stylex.props(styles.loadingSkeletonContainer)}>
      <SkeletonLine
        borderRadius={themeCssVariables.border.radius.smRound}
        height={SKELETON_HEIGHT_SIZES.m}
      />
      <SkeletonLine
        borderRadius={themeCssVariables.border.radius.smRound}
        height={SKELETON_HEIGHT_SIZES.m}
      />
      <SkeletonLine
        borderRadius={themeCssVariables.border.radius.smRound}
        height={SKELETON_HEIGHT_SIZES.m}
      />
    </div>
  );
};

export const WorkflowRunCard = () => {
  const targetRecord = useTargetRecord();
  const componentId = useId();

  return (
    <WorkflowVisualizerComponentInstanceContext.Provider
      value={{
        instanceId: getWorkflowVisualizerComponentInstanceId({
          recordId: targetRecord.id,
        }),
      }}
    >
      <WorkflowRunVisualizerComponentInstanceContext.Provider
        value={{
          instanceId: componentId,
        }}
      >
        <WorkflowRunVisualizerEffect workflowRunId={targetRecord.id} />
        <WorkflowRunSSESubscribeEffect workflowRunId={targetRecord.id} />
        <Suspense fallback={<LoadingSkeleton />}>
          <WorkflowRunVisualizer workflowRunId={targetRecord.id} />
        </Suspense>
      </WorkflowRunVisualizerComponentInstanceContext.Provider>
    </WorkflowVisualizerComponentInstanceContext.Provider>
  );
};
