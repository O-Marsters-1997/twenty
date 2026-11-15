import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { getRecordFormFieldInputSettings } from '@/object-record/record-form/utils/getRecordFormFieldInputSettings';
import { isFieldRelation } from '@/object-record/record-field/ui/types/guards/isFieldRelation';
import { type UpdateMultipleRecordsState } from '@/object-record/record-update-multiple/components/UpdateMultipleRecordsContainer';
import { isUpdateRecordValueEmpty } from '@/object-record/record-update-multiple/utils/isUpdateRecordValueEmpty';
import { shouldDisplayFormMultiEditField } from '@/object-record/record-update-multiple/utils/shouldDisplayFormMultiEditField';
import * as stylex from '@stylexjs/stylex';
import { FieldMetadataType } from 'twenty-shared/types';
import { computeRelationGqlFieldJoinColumnName } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-6'],
    paddingBlock: spacing['--t-spacing-4'],
    paddingInline: spacing['--t-spacing-3'],
    width: 'auto',
  },
});

export type UpdateMultipleRecordsFormProps = {
  objectNameSingular: string;
  disabled?: boolean;
  values: UpdateMultipleRecordsState;
  onChange: (fieldName: string, value: any) => void;
};

export const UpdateMultipleRecordsForm = ({
  objectNameSingular,
  disabled = false,
  values,
  onChange,
}: UpdateMultipleRecordsFormProps) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular,
  });

  const editableFields = objectMetadataItem.fields
    .filter(shouldDisplayFormMultiEditField)
    .sort((fieldA, fieldB) => fieldA.name.localeCompare(fieldB.name));

  const fieldsWithDefinitions = editableFields.map((fieldMetadataItem) => ({
    fieldMetadataItem,
    fieldDefinition: formatFieldMetadataItemAsFieldDefinition({
      field: fieldMetadataItem,
      objectMetadataItem,
      showLabel: true,
      labelWidth: 90,
    }),
  }));

  return (
    <Section.Root className={stylex.props(styles.section).className}>
      {fieldsWithDefinitions.map(({ fieldMetadataItem, fieldDefinition }) => {
        const fieldName = fieldDefinition.metadata.fieldName;
        const isRelation = isFieldRelation(fieldDefinition);
        const fieldNameOrRelationIdName =
          isRelation && fieldMetadataItem.type === FieldMetadataType.RELATION
            ? computeRelationGqlFieldJoinColumnName({
                name: fieldMetadataItem.name,
              })
            : fieldName;

        const value = values[fieldNameOrRelationIdName];

        const handleValueChange = (newValue: any) => {
          if (newValue === null) {
            onChange(fieldNameOrRelationIdName, null);
          } else if (isUpdateRecordValueEmpty(newValue)) {
            onChange(fieldNameOrRelationIdName, undefined);
          } else {
            onChange(fieldNameOrRelationIdName, newValue);
          }
        };

        return (
          <FormFieldInput
            key={fieldDefinition.metadata.fieldName}
            readonly={disabled}
            field={fieldDefinition}
            defaultValue={value}
            onChange={handleValueChange}
            onClear={() => onChange(fieldNameOrRelationIdName, undefined)}
            settings={getRecordFormFieldInputSettings(fieldMetadataItem.type)}
          />
        );
      })}
    </Section.Root>
  );
};
