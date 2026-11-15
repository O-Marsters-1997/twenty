import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { workflowRunIteratorSubStepIterationIndexComponentState } from '@/side-panel/pages/workflow/step/view-run/states/workflowRunIteratorSubStepIterationIndexComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useWorkflowRun } from '@/workflow/hooks/useWorkflowRun';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { type WorkflowFormAction } from '@/workflow/types/Workflow';
import { WorkflowRunSSESubscribeEffect } from '@/workflow/workflow-diagram/components/WorkflowRunSSESubscribeEffect';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { useUpdateWorkflowRunStep } from '@/workflow/workflow-steps/hooks/useUpdateWorkflowRunStep';
import { WorkflowFormFields } from '@/workflow/workflow-steps/workflow-actions/form-action/components/WorkflowFormFields';
import { WorkflowFormStepSubmitButton } from '@/workflow/workflow-steps/workflow-actions/form-action/components/WorkflowFormStepSubmitButton';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { getFormInstructionsContext } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getFormInstructionsContext';
import { resolveFormInstructions } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/resolveFormInstructions';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';
import * as stylex from '@stylexjs/stylex';
import { font } from 'twenty-ui/theme/tokens.stylex';

export type WorkflowEditActionFormFillerProps = {
  action: WorkflowFormAction;
  actionOptions: {
    readonly: boolean;
  };
};

type FormData = WorkflowFormActionField[];

const styles = stylex.create({
  instructions: {
    color: fontColor['--t-font-color-secondary'],
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

export const WorkflowEditActionFormFiller = ({
  action,
  actionOptions,
}: WorkflowEditActionFormFillerProps) => {
  const [formData, setFormData] = useState<FormData>(action.settings.input);
  const workflowRunId = useWorkflowRunIdOrThrow();
  const workflowRun = useWorkflowRun({ workflowRunId });
  const workflowRunIteratorSubStepIterationIndex = useAtomComponentStateValue(
    workflowRunIteratorSubStepIterationIndexComponentState,
  );
  const instructionsContext = getFormInstructionsContext({
    stepId: action.id,
    workflowRun,
    iterationIndex: workflowRunIteratorSubStepIterationIndex,
  });
  const instructions = isDefined(instructionsContext)
    ? resolveFormInstructions({
        instructions: action.settings.instructions,
        context: instructionsContext,
      })
    : undefined;
  const { goBackFromSidePanel } = useSidePanelHistory();
  const { updateWorkflowRunStep } = useUpdateWorkflowRunStep();
  const [error, setError] = useState<string | undefined>(undefined);

  const canSubmit = !actionOptions.readonly && !isDefined(error);

  const onFieldUpdate = (fieldName: string, value: unknown) => {
    if (actionOptions.readonly === true) {
      return;
    }

    const updatedFormData = formData.map((field) =>
      field.name === fieldName ? { ...field, value } : field,
    );

    setFormData(updatedFormData);

    saveAction(updatedFormData);
  };

  const saveAction = useDebouncedCallback(async (updatedFormData: FormData) => {
    if (actionOptions.readonly === true) {
      return;
    }

    await updateWorkflowRunStep({
      workflowRunId,
      step: {
        ...action,
        settings: { ...action.settings, input: updatedFormData },
      },
    });
  }, 1_000);

  const getResponse = async () => {
    await saveAction.flush();

    return Object.fromEntries(
      formData.map((field) => [field.name, field.value]),
    );
  };

  useEffect(() => {
    return () => {
      saveAction.flush();
    };
  }, [saveAction]);

  return (
    <>
      <WorkflowRunSSESubscribeEffect workflowRunId={workflowRunId} />
      <WorkflowStepBody>
        {isDefined(instructions) && (
          <div {...stylex.props(styles.instructions)}>{instructions}</div>
        )}
        <WorkflowFormFields
          fields={formData}
          readonly={actionOptions.readonly}
          onChange={onFieldUpdate}
          onError={setError}
        />
      </WorkflowStepBody>
      {!actionOptions.readonly && (
        <SidePanelFooter
          actions={[
            <WorkflowFormStepSubmitButton
              key="submit"
              workflowRunId={workflowRunId}
              stepId={action.id}
              disabled={!canSubmit}
              getResponse={getResponse}
              onSubmitted={goBackFromSidePanel}
            />,
          ]}
        />
      )}
    </>
  );
};
