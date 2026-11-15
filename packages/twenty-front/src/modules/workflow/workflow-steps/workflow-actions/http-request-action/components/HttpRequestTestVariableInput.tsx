import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowStep } from '@/workflow/types/Workflow';
import { getWorkflowVariablesUsedInStep } from '@/workflow/workflow-steps/utils/getWorkflowVariablesUsedInStep';
import { type HttpRequestFormData } from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/HttpRequest';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { httpRequestTestDataFamilyState } from '@/workflow/workflow-steps/workflow-actions/http-request-action/states/httpRequestTestDataFamilyState';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  variableInputsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
});

type HttpRequestTestVariableInputProps = {
  httpRequestFormData: HttpRequestFormData;
  actionId: string;
  readonly?: boolean;
};

export const HttpRequestTestVariableInput = ({
  httpRequestFormData,
  actionId,
  readonly,
}: HttpRequestTestVariableInputProps) => {
  const httpRequestTestData = useAtomFamilyStateValue(
    httpRequestTestDataFamilyState,
    actionId,
  );
  const setHttpRequestTestData = useSetAtomFamilyState(
    httpRequestTestDataFamilyState,
    actionId,
  );
  const mockStep: WorkflowStep = {
    id: 'test-step',
    name: 'Test Step',
    type: 'HTTP_REQUEST',
    valid: true,
    settings: {
      input: httpRequestFormData,
      outputSchema: {},
      errorHandlingOptions: {
        retryOnFailure: { value: 0 },
        continueOnFailure: { value: false },
      },
    },
  };

  const variablesUsed = getWorkflowVariablesUsedInStep({ step: mockStep });
  const variableArray = Array.from(variablesUsed);

  const handleVariableChange = (variablePath: string, value: string) => {
    setHttpRequestTestData((prev) => ({
      ...prev,
      variableValues: {
        ...prev.variableValues,
        [variablePath]: value,
      },
    }));
  };

  if (variableArray.length === 0) {
    return null;
  }

  return (
    <FormFieldInputContainer>
      <div {...stylex.props(styles.variableInputsContainer)}>
        {variableArray.map((variablePath) => (
          <FormTextFieldInput
            key={variablePath}
            label={`${variablePath}`}
            placeholder={t`Enter test value`}
            readonly={readonly}
            defaultValue={
              httpRequestTestData.variableValues[variablePath] || ''
            }
            onChange={(value) =>
              handleVariableChange(variablePath, value || '')
            }
          />
        ))}
      </div>
    </FormFieldInputContainer>
  );
};
