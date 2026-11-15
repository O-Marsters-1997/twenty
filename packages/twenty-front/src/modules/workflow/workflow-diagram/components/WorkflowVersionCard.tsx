import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { getWorkflowVisualizerComponentInstanceId } from '@/workflow/utils/getWorkflowVisualizerComponentInstanceId';
import { WorkflowVersionVisualizer } from '@/workflow/workflow-diagram/components/WorkflowVersionVisualizer';
import { WorkflowVersionVisualizerEffect } from '@/workflow/workflow-diagram/components/WorkflowVersionVisualizerEffect';
import { WorkflowVisualizerComponentInstanceContext } from '@/workflow/workflow-diagram/states/contexts/WorkflowVisualizerComponentInstanceContext';
import { Suspense } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
const styles = stylex.create({
  loadingSkeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    height: '100%',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
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

export const WorkflowVersionCard = () => {
  const targetRecord = useTargetRecord();

  return (
    <WorkflowVisualizerComponentInstanceContext.Provider
      value={{
        instanceId: getWorkflowVisualizerComponentInstanceId({
          recordId: targetRecord.id,
        }),
      }}
    >
      <WorkflowVersionVisualizerEffect workflowVersionId={targetRecord.id} />
      <Suspense fallback={<LoadingSkeleton />}>
        <WorkflowVersionVisualizer workflowVersionId={targetRecord.id} />
      </Suspense>
    </WorkflowVisualizerComponentInstanceContext.Provider>
  );
};
