import { RecordChip } from '@/object-record/components/RecordChip';
import { FormFieldPlaceholder } from '@/object-record/record-field/ui/form-types/components/FormFieldPlaceholder';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type FormMultiRecordPickerDraftValue } from '@/object-record/record-field/ui/form-types/utils/getFormMultiRecordPickerDraftValue';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { OverflowingList } from 'twenty-ui/components/layout';
import { isStandaloneVariableString } from 'twenty-shared/workflow';
import { t } from '@lingui/core/macro';
import { isNonEmptyArray } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  chipsContainer: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    marginInline: spacing['--t-spacing-2'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
});

type FormMultiRecordFieldChipsProps = {
  draftValue: FormMultiRecordPickerDraftValue;
  selectedRecords: ObjectRecord[];
  objectNameSingular: string;
  readonly?: boolean;
  onUnlinkVariable: () => void;
  onRemoveStaticVariable: (variable: string) => void;
};

export const FormMultiRecordFieldChips = ({
  draftValue,
  selectedRecords,
  objectNameSingular,
  readonly,
  onUnlinkVariable,
  onRemoveStaticVariable,
}: FormMultiRecordFieldChipsProps) => {
  if (draftValue.type === 'variable') {
    return (
      <div {...stylex.props(styles.chipsContainer)}>
        <VariableChipStandalone
          rawVariableName={draftValue.value}
          onRemove={readonly ? undefined : onUnlinkVariable}
          isFullRecord
        />
      </div>
    );
  }

  const staticVariables = draftValue.value.filter((entry) =>
    isStandaloneVariableString(entry),
  );

  if (!isNonEmptyArray(selectedRecords) && !isNonEmptyArray(staticVariables)) {
    return (
      <div {...stylex.props(styles.chipsContainer)}>
        <FormFieldPlaceholder>{t`Select`}</FormFieldPlaceholder>
      </div>
    );
  }

  const chips = [
    ...selectedRecords.map((record) => (
      <RecordChip
        key={record.id}
        record={record}
        objectNameSingular={objectNameSingular}
      />
    )),
    ...staticVariables.map((variable) => (
      <VariableChipStandalone
        key={variable}
        rawVariableName={variable}
        onRemove={readonly ? undefined : () => onRemoveStaticVariable(variable)}
        isFullRecord
      />
    )),
  ];

  return (
    <div {...stylex.props(styles.chipsContainer)}>
      <OverflowingList
        overflowLabel={t`Show all items`}
        showOverflowCount={true}
      >
        {chips}
      </OverflowingList>
    </div>
  );
};
