import { workflowRunIteratorSubStepIterationIndexComponentState } from '@/side-panel/pages/workflow/step/view-run/states/workflowRunIteratorSubStepIterationIndexComponentState';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useFlowOrThrow } from '@/workflow/hooks/useFlowOrThrow';
import { useWorkflowRun } from '@/workflow/hooks/useWorkflowRun';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { getStepDefinitionOrThrow } from '@/workflow/utils/getStepDefinitionOrThrow';
import { getIsDescendantOfIterator } from '@/workflow/workflow-steps/utils/getIsDescendantOfIterator';
import { getWorkflowRunAllStepInfoHistory } from '@/workflow/workflow-steps/utils/getWorkflowRunAllStepInfoHistory';
import { plural, t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import { spacing, fontColor, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  counter: {
    color: fontColor['--t-font-color-tertiary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});

export const WorkflowIteratorSubStepSwitcher = ({
  stepId,
}: {
  stepId: string;
}) => {
  const flow = useFlowOrThrow();
  const workflowRunId = useWorkflowRunIdOrThrow();
  const workflowRun = useWorkflowRun({ workflowRunId });

  const [
    workflowRunIteratorSubStepIterationIndex,
    setWorkflowRunIteratorSubStepIterationIndex,
  ] = useAtomComponentState(
    workflowRunIteratorSubStepIterationIndexComponentState,
  );

  const stepDefinition = getStepDefinitionOrThrow({
    stepId,
    trigger: flow.trigger,
    steps: flow.steps,
  });

  const stepInfo = workflowRun?.state?.stepInfos[stepId];

  if (
    !isDefined(stepInfo) ||
    !isDefined(workflowRun?.state) ||
    !isDefined(flow.steps) ||
    stepDefinition?.type !== 'action'
  ) {
    return null;
  }

  const allStepInfos = getWorkflowRunAllStepInfoHistory({
    stepInfo,
  });

  const isDescendantOfIterator = getIsDescendantOfIterator({
    stepId,
    steps: flow.steps,
  });

  const workflowRunIteratorSubStepIterationsCount = allStepInfos.length;

  const canGoToPreviousIndex = workflowRunIteratorSubStepIterationIndex > 0;
  const canGoToNextIndex =
    workflowRunIteratorSubStepIterationIndex <
    workflowRunIteratorSubStepIterationsCount - 1;

  const handleDecrementIndex = () => {
    if (!canGoToPreviousIndex) {
      return;
    }

    setWorkflowRunIteratorSubStepIterationIndex(
      workflowRunIteratorSubStepIterationIndex - 1,
    );
  };

  const handleIncrementIndex = () => {
    if (!canGoToNextIndex) {
      return;
    }

    setWorkflowRunIteratorSubStepIterationIndex(
      workflowRunIteratorSubStepIterationIndex + 1,
    );
  };

  if (!isDescendantOfIterator) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <IconButton
        aria-label={t`Previous iteration`}
        size="sm"
        disabled={!canGoToPreviousIndex}
        onClick={handleDecrementIndex}
      >
        <IconChevronLeft />
      </IconButton>

      <div {...stylex.props(styles.counter)}>
        {workflowRunIteratorSubStepIterationIndex + 1}/
        {plural(workflowRunIteratorSubStepIterationsCount, {
          one: '# item',
          other: '# items',
        })}
      </div>

      <IconButton
        aria-label={t`Next iteration`}
        size="sm"
        disabled={!canGoToNextIndex}
        onClick={handleIncrementIndex}
      >
        <IconChevronRight />
      </IconButton>
    </div>
  );
};
