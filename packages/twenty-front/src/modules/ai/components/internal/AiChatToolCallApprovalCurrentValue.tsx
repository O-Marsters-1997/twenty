import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

import { FieldContextProvider } from '@/object-record/record-field/ui/components/FieldContextProvider';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isFieldValueEmpty } from '@/object-record/record-field/ui/utils/isFieldValueEmpty';
import { useRecordFieldValue } from '@/object-record/record-store/hooks/useRecordFieldValue';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  currentValue: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
    overflowWrap: 'anywhere',
  },
});

type AiChatToolCallApprovalCurrentValueProps = {
  objectNameSingular: string;
  recordId: string;
  fieldDefinition: FieldDefinition<FieldMetadata>;
};

// the record is loaded in the store by the card, so its value shows as anywhere else in the app
export const AiChatToolCallApprovalCurrentValue = ({
  objectNameSingular,
  recordId,
  fieldDefinition,
}: AiChatToolCallApprovalCurrentValueProps) => {
  const { t } = useLingui();
  const { fieldName } = fieldDefinition.metadata;
  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);
  const fieldValue = useRecordFieldValue(recordId, fieldName, fieldDefinition);

  // the card loads the record, and a value read before then would show as empty
  if (!isDefined(recordStore)) {
    return null;
  }

  return (
    <div {...stylex.props(styles.currentValue)}>
      {t`Currently:`}
      {isFieldValueEmpty({ fieldDefinition, fieldValue }) ? (
        t`Empty`
      ) : (
        <FieldContextProvider
          objectNameSingular={objectNameSingular}
          objectRecordId={recordId}
          fieldMetadataName={fieldName}
          fieldPosition={0}
          showLabel={false}
        >
          <RecordFieldComponentInstanceContext.Provider
            value={{
              instanceId: `ai-chat-tool-call-approval-${recordId}-${fieldName}`,
            }}
          >
            <FieldDisplay />
          </RecordFieldComponentInstanceContext.Provider>
        </FieldContextProvider>
      )}
    </div>
  );
};
