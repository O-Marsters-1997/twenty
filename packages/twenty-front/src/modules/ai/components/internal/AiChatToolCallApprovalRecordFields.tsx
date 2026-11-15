import { useMemo } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type JsonValue } from 'type-fest';

import { AiChatToolCallApprovalCurrentValue } from '@/ai/components/internal/AiChatToolCallApprovalCurrentValue';
import { objectMetadataItemFamilySelector } from '@/object-metadata/states/objectMetadataItemFamilySelector';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { isFieldRelationManyToOne } from '@/object-record/record-field/ui/types/guards/isFieldRelationManyToOne';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

// approvers read amounts in currency units, as the record shows them, not as micros
const CURRENCY_INPUT_SETTINGS = {
  type: FieldMetadataType.CURRENCY,
  amountUnit: 'units',
} as const;

const styles = stylex.create({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
  },
  unknownField: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    overflowWrap: 'anywhere',
  },
});

type AiChatToolCallApprovalRecordFieldsProps = {
  objectNameSingular: string;
  values: Record<string, unknown>;
  // an update shows each field's current value next to the proposed one
  recordId?: string;
  readonly: boolean;
  onChange: (fieldName: string, value: JsonValue) => void;
};

export const AiChatToolCallApprovalRecordFields = ({
  objectNameSingular,
  values,
  recordId,
  readonly,
  onChange,
}: AiChatToolCallApprovalRecordFieldsProps) => {
  const objectMetadataItem = useAtomFamilySelectorValue(
    objectMetadataItemFamilySelector,
    { objectName: objectNameSingular, objectNameType: 'singular' },
  );

  // a many-to-one relation is set through its foreign key
  const fieldDefinitionsByArgumentName = useMemo(
    () =>
      new Map(
        isDefined(objectMetadataItem)
          ? objectMetadataItem.fields.map((field) => {
              const fieldDefinition = formatFieldMetadataItemAsFieldDefinition({
                field,
                objectMetadataItem,
                showLabel: true,
                labelWidth: 90,
              });

              return [
                isFieldRelationManyToOne(fieldDefinition)
                  ? `${field.name}Id`
                  : field.name,
                fieldDefinition,
              ] as const;
            })
          : [],
      ),
    [objectMetadataItem],
  );

  return (
    <>
      {Object.entries(values)
        .filter(([fieldName]) => fieldName !== 'id')
        .map(([fieldName, value]) => {
          const fieldDefinition = fieldDefinitionsByArgumentName.get(fieldName);

          if (!isDefined(fieldDefinition)) {
            return (
              <div key={fieldName} {...stylex.props(styles.unknownField)}>
                {`${fieldName}: ${JSON.stringify(value)}`}
              </div>
            );
          }

          return (
            <div key={fieldName} {...stylex.props(styles.field)}>
              <FormFieldInput
                field={fieldDefinition}
                settings={CURRENCY_INPUT_SETTINGS}
                defaultValue={value as JsonValue}
                readonly={readonly}
                onChange={(updatedValue) => onChange(fieldName, updatedValue)}
                onClear={() => onChange(fieldName, null)}
              />
              {isDefined(recordId) && (
                <AiChatToolCallApprovalCurrentValue
                  objectNameSingular={objectNameSingular}
                  recordId={recordId}
                  fieldDefinition={fieldDefinition}
                />
              )}
            </div>
          );
        })}
    </>
  );
};
