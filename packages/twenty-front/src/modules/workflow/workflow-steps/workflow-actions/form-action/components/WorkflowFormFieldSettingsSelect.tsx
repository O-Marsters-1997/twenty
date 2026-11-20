import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { getDefaultFormFieldSettings } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getDefaultFormFieldSettings';
import { t } from '@lingui/core/macro';
import camelCase from 'lodash.camelcase';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type WorkflowFormFieldSettingsSelectProps = {
  field: WorkflowFormActionField;
  onChange: (updatedField: WorkflowFormActionField) => void;
};

const styles = stylex.create({
  formFieldSettingsSelect: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  rowContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'row',
  },
});

export const WorkflowFormFieldSettingsSelect = ({
  field,
  onChange,
}: WorkflowFormFieldSettingsSelectProps) => {
  const selectTypeOptions = [
    {
      label: t`Existing Field`,
      value: 'EXISTING_FIELD',
    },
  ];

  const { activeNonSystemObjectMetadataItems } =
    useFilteredObjectMetadataItems();

  const selectFieldId = field.settings?.selectedFieldId;

  const fieldOptions = activeNonSystemObjectMetadataItems.reduce(
    (acc, objectMetadataItem) => {
      return acc.concat(
        objectMetadataItem.fields
          .filter(
            (objectField) =>
              objectField.isActive &&
              !isHiddenSystemField(objectField) &&
              objectField.type === field.type,
          )
          .map((objectField) => ({
            label: `${objectMetadataItem.labelSingular} > ${objectField.label}`,
            value: objectField.id,
          })),
      );
    },
    [] as { label: string; value: string }[],
  );

  return (
    <div {...stylex.props(styles.formFieldSettingsSelect)}>
      <div {...stylex.props(styles.rowContainer)}>
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
            placeholder={getDefaultFormFieldSettings(field.type).label}
          />
        </FormFieldInputContainer>
        <FormFieldInputContainer>
          <InputLabel>{t`Select Type`}</InputLabel>
          <FormSelectFieldInput
            onChange={(newSelectType: string | null) => {
              if (newSelectType === null) {
                return;
              }
              onChange({
                ...field,
                settings: {
                  ...field.settings,
                  selectType: newSelectType,
                },
              });
            }}
            defaultValue={'EXISTING_FIELD'}
            options={selectTypeOptions}
            readonly
          />
        </FormFieldInputContainer>
      </div>
      <FormFieldInputContainer>
        <InputLabel>{t`Field`}</InputLabel>
        <FormSelectFieldInput
          onChange={(newSelectFieldId: string | null) => {
            if (newSelectFieldId === null) {
              return;
            }
            onChange({
              ...field,
              settings: {
                ...field.settings,
                selectedFieldId: newSelectFieldId,
              },
            });
          }}
          defaultValue={selectFieldId}
          options={fieldOptions}
        />
      </FormFieldInputContainer>
    </div>
  );
};
