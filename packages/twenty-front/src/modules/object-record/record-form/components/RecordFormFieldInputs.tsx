import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { getFieldMetadataItemGqlFieldName } from '@/object-metadata/utils/getFieldMetadataItemGqlFieldName';
import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { getRecordFormFieldInputSettings } from '@/object-record/record-form/utils/getRecordFormFieldInputSettings';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { type JsonValue } from 'type-fest';
import { Field } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fieldList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
});

type RecordFormFieldInputsProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  fieldMetadataItems: FieldMetadataItem[];
  draftRecord: Partial<ObjectRecord>;
  onFieldValueChange: (gqlFieldName: string, value: JsonValue) => void;
  onFieldValueClear: (gqlFieldName: string) => void;
};

export const RecordFormFieldInputs = ({
  objectMetadataItem,
  fieldMetadataItems,
  draftRecord,
  onFieldValueChange,
  onFieldValueClear,
}: RecordFormFieldInputsProps) => (
  <div {...stylex.props(styles.fieldList)}>
    {fieldMetadataItems.map((fieldMetadataItem) => {
      const gqlFieldName = getFieldMetadataItemGqlFieldName(fieldMetadataItem);

      return (
        <Field.Root key={fieldMetadataItem.id}>
          <FormFieldInput
            field={formatFieldMetadataItemAsFieldDefinition({
              field: fieldMetadataItem,
              objectMetadataItem,
              showLabel: true,
            })}
            defaultValue={draftRecord[gqlFieldName]}
            onChange={(value) => onFieldValueChange(gqlFieldName, value)}
            onClear={() => onFieldValueClear(gqlFieldName)}
            settings={getRecordFormFieldInputSettings(fieldMetadataItem.type)}
          />
        </Field.Root>
      );
    })}
  </div>
);
