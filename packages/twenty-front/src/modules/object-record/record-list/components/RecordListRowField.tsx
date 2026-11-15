import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { RECORD_LIST_ROW_INPUT_ID_PREFIX } from '@/object-record/record-list/constants/RecordListRowInputIdPrefix';
import { type ColumnDefinition } from '@/object-record/record-table/types/ColumnDefinition';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import * as stylex from '@stylexjs/stylex';
import { Tooltip } from 'twenty-ui/primitives/surfaces';

const styles = stylex.create({
  fieldContainer: {
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden',
  },
  maxWidth: (maxWidth: number) => ({
    maxWidth,
  }),
  nonInteractiveContent: {
    display: 'contents',
    pointerEvents: 'none',
  },
});

type RecordListRowFieldProps = {
  recordId: string;
  recordField: RecordField;
  fieldDefinition: ColumnDefinition<FieldMetadata>;
  maxWidth: number;
};

export const RecordListRowField = ({
  recordId,
  recordField,
  fieldDefinition,
  maxWidth,
}: RecordListRowFieldProps) => {
  return (
    <Tooltip.Trigger
      payload={recordField.fieldMetadataItemId}
      delay={TooltipDelay.shortDelay}
      render={
        <div
          {...stylex.props(styles.fieldContainer, styles.maxWidth(maxWidth))}
        />
      }
    >
      <FieldContext.Provider
        value={{
          recordId,
          maxWidth,
          isLabelIdentifier: false,
          isRecordFieldReadOnly: true,
          fieldDefinition,
          isDisplayModeFixHeight: true,
          disableChipClick: true,
          triggerEvent: 'CLICK',
        }}
      >
        <RecordFieldComponentInstanceContext.Provider
          value={{
            instanceId: getRecordFieldInputInstanceId({
              recordId,
              fieldName: fieldDefinition.metadata.fieldName,
              prefix: RECORD_LIST_ROW_INPUT_ID_PREFIX,
            }),
          }}
        >
          <div {...stylex.props(styles.nonInteractiveContent)}>
            <FieldDisplay />
          </div>
        </RecordFieldComponentInstanceContext.Provider>
      </FieldContext.Provider>
    </Tooltip.Trigger>
  );
};
