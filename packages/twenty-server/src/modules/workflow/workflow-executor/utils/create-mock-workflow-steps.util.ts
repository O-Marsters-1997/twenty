import {
  type StepIfElseBranch,
  WorkflowActionType,
} from 'twenty-shared/workflow';

import { type WorkflowIfElseActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/types/workflow-if-else-action-settings.type';
import { type WorkflowIteratorActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/types/workflow-iterator-action-settings.type';
import {
  type WorkflowEmptyAction,
  type WorkflowIfElseAction,
  type WorkflowIteratorAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const createMockCodeStep = (
  id: string,
  nextStepIds: string[] = [],
  {
    continueOnFailure = false,
    retryOnFailure = 0,
  }: { continueOnFailure?: boolean; retryOnFailure?: number } = {},
): WorkflowEmptyAction => ({
  id,
  name: `Step ${id}`,
  type: WorkflowActionType.EMPTY,
  valid: true,
  nextStepIds,
  settings: {
    input: {},
    outputSchema: {},
    errorHandlingOptions: {
      continueOnFailure: { value: continueOnFailure },
      retryOnFailure: { value: retryOnFailure },
    },
  },
});

export const createMockIteratorStep = (
  id: string,
  nextStepIds: string[] = [],
  initialLoopStepIds: string[] = [],
  shouldContinueOnIterationFailure = false,
): WorkflowIteratorAction => ({
  id,
  name: `Iterator ${id}`,
  type: WorkflowActionType.ITERATOR,
  valid: true,
  nextStepIds,
  settings: {
    input: {
      initialLoopStepIds,
      shouldContinueOnIterationFailure,
    } as WorkflowIteratorActionInput,
    outputSchema: {},
    errorHandlingOptions: {
      continueOnFailure: { value: false },
      retryOnFailure: { value: 0 },
    },
  },
});

export const createMockIfElseStep = (
  id: string,
  branches: StepIfElseBranch[],
  nextStepIds: string[] = [],
  { continueOnFailure = false }: { continueOnFailure?: boolean } = {},
): WorkflowIfElseAction => ({
  id,
  name: `Step ${id}`,
  type: WorkflowActionType.IF_ELSE,
  valid: true,
  nextStepIds,
  settings: {
    input: {
      stepFilterGroups: [],
      stepFilters: [],
      branches,
    },
    outputSchema: {},
    errorHandlingOptions: {
      continueOnFailure: { value: continueOnFailure },
      retryOnFailure: { value: 0 },
    },
  } as WorkflowIfElseActionSettings,
});
