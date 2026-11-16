import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { getDefaultFormFieldSettings } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getDefaultFormFieldSettings';
import { t } from '@lingui/core/macro';
import camelCase from 'lodash.camelcase';
import { FieldMetadataType } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type WorkflowFormFieldSettingsNumberProps = {
  field: WorkflowFormActionField;
  onChange: (updatedField: WorkflowFormActionField) => void;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
  },
});

export const WorkflowFormFieldSettingsNumber = ({
  field,
  onChange,
}: WorkflowFormFieldSettingsNumberProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <FormFieldInputContainer>
        <InputLabel>{t`Label`}</InputLabel>
        <FormTextFieldInput
          onChange={(newLabel: string) => {
            onChange({
              ...field,
              label: newLabel,
              name: camelCase(newLabel),
            });
          }}
          defaultValue={field.label}
          placeholder={
            getDefaultFormFieldSettings(FieldMetadataType.NUMBER).label
          }
        />
      </FormFieldInputContainer>
      <FormFieldInputContainer>
        <InputLabel>{t`Placeholder`}</InputLabel>
        <FormTextFieldInput
          onChange={(newPlaceholder: string) => {
            onChange({
              ...field,
              placeholder: newPlaceholder,
            });
          }}
          defaultValue={field.placeholder}
          placeholder={
            getDefaultFormFieldSettings(FieldMetadataType.NUMBER).placeholder
          }
        />
      </FormFieldInputContainer>
    </div>
  );
};
