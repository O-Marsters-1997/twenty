import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { FormMultiRecordFieldChips } from '@/object-record/record-field/ui/form-types/components/FormMultiRecordFieldChips';
import { useOpenFormMultiRecordPicker } from '@/object-record/record-field/ui/form-types/hooks/useOpenFormMultiRecordPicker';
import {
  type RecordId,
  type Variable,
} from '@/object-record/record-field/ui/form-types/types/RecordPickerValue';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import {
  type FormMultiRecordPickerDraftValue,
  getFormMultiRecordPickerDraftValue,
} from '@/object-record/record-field/ui/form-types/utils/getFormMultiRecordPickerDraftValue';
import { MultipleRecordPicker } from '@/object-record/record-picker/multiple-record-picker/components/MultipleRecordPicker';
import { type RecordPickerPickableMorphItem } from '@/object-record/record-picker/types/RecordPickerPickableMorphItem';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { t } from '@lingui/core/macro';
import { isNonEmptyArray } from '@sniptt/guards';
import { useId, useState } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { isDefined, isValidUuid } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { IconChevronDown } from 'twenty-ui/icon';
import { Field } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import { mapArrayToObject } from '~/utils/array/mapArrayToObject';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  formSelectContainerWrapper: {
    cursor: 'pointer',
    display: 'flex',
    height: 32,
    minWidth: 0,
    width: '100%',
  },
  formSelectContainerWrapperReadonly: {
    cursor: 'default',
  },
  iconButton: {
    display: 'flex',
    paddingRight: spacing['--t-spacing-2'],
  },
  dropdownContainer: {
    flex: '1',
    display: 'flex',
    minWidth: '0',
  },
  variablePickerContainer: {
    display: 'flex',
    flexShrink: '0',
  },
});

export type FormMultiRecordPickerProps = {
  label?: string;
  defaultValue?: Array<RecordId | Variable> | Variable | string | null;
  onChange: (value: Array<RecordId | Variable> | Variable) => void;
  objectNameSingular: string;
  readonly?: boolean;
  testId?: string;
  VariablePicker?: VariablePickerComponent;
};

export const FormMultiRecordPicker = ({
  label,
  defaultValue,
  onChange,
  objectNameSingular,
  readonly,
  testId,
  VariablePicker,
}: FormMultiRecordPickerProps) => {
  const theme = useTheme();

  const [draftValue, setDraftValue] = useState<FormMultiRecordPickerDraftValue>(
    getFormMultiRecordPickerDraftValue(defaultValue),
  );

  const componentId = useId();
  const dropdownId = `form-multi-record-picker-${componentId}`;
  const variablesDropdownId = `form-multi-record-picker-${componentId}-variables`;

  const { closeDropdown } = useCloseDropdown();
  const { enqueueToast } = useToast();
  const { openFormMultiRecordPicker } = useOpenFormMultiRecordPicker({
    objectNameSingular,
  });

  const staticRecordIds =
    draftValue.type === 'static'
      ? draftValue.value.filter((entry) => isValidUuid(entry))
      : [];

  const { records: selectedRecords } = useFindManyRecords({
    objectNameSingular,
    filter: { id: { in: staticRecordIds } },
    limit: Math.min(staticRecordIds.length, QUERY_MAX_RECORDS),
    skip: !isNonEmptyArray(staticRecordIds),
    withSoftDeleted: true,
  });

  const selectedRecordsById = mapArrayToObject(
    selectedRecords,
    (record) => record.id,
  );

  const orderedSelectedRecords = staticRecordIds
    .map((recordId) => selectedRecordsById[recordId])
    .filter(isDefined);

  const handleOpenDropdown = () => {
    if (draftValue.type !== 'static') {
      return;
    }

    openFormMultiRecordPicker({
      pickerInstanceId: dropdownId,
      selectedRecordIds: staticRecordIds,
      selectedRecords: orderedSelectedRecords,
    });
  };

  const handleMorphItemChange = (morphItem: RecordPickerPickableMorphItem) => {
    if (draftValue.type !== 'static') {
      return;
    }

    const valueWithoutRecord = draftValue.value.filter(
      (entry) => entry !== morphItem.recordId,
    );

    if (morphItem.isSelected) {
      const selectedRecordCount = valueWithoutRecord.filter((entry) =>
        isValidUuid(entry),
      ).length;

      if (selectedRecordCount >= QUERY_MAX_RECORDS) {
        enqueueToast({
          status: 'warning',
          children: t`You can select at most ${QUERY_MAX_RECORDS} records.`,
        });

        return;
      }
    }

    const updatedValue = morphItem.isSelected
      ? [...valueWithoutRecord, morphItem.recordId]
      : valueWithoutRecord;

    setDraftValue({ type: 'static', value: updatedValue });
    onChange(updatedValue);
  };

  const handleVariableTagInsert = (variableName: string) => {
    setDraftValue({ type: 'variable', value: variableName });
    onChange(variableName);
  };

  const handleUnlinkVariable = () => {
    setDraftValue({ type: 'static', value: [] });
    onChange([]);
  };

  const handleRemoveStaticVariable = (variable: string) => {
    if (draftValue.type !== 'static') {
      return;
    }

    const updatedValue = draftValue.value.filter((entry) => entry !== variable);

    setDraftValue({ type: 'static', value: updatedValue });
    onChange(updatedValue);
  };

  const chips = (
    <FormMultiRecordFieldChips
      draftValue={draftValue}
      selectedRecords={orderedSelectedRecords}
      objectNameSingular={objectNameSingular}
      readonly={readonly}
      onUnlinkVariable={handleUnlinkVariable}
      onRemoveStaticVariable={handleRemoveStaticVariable}
    />
  );

  return (
    <FormFieldInputContainer data-testid={testId}>
      {label ? <Field.Label>{label}</Field.Label> : null}
      <FormFieldInputRowContainer>
        {readonly || draftValue.type === 'variable' ? (
          <div
            {...stylex.props(
              styles.formSelectContainerWrapper,
              readonly && styles.formSelectContainerWrapperReadonly,
            )}
          >
            <FormFieldInputInnerContainer
              formFieldInputInstanceId={componentId}
              hasRightElement={false}
            >
              {chips}
            </FormFieldInputInnerContainer>
          </div>
        ) : (
          <div {...stylex.props(styles.dropdownContainer)}>
            <Dropdown
              dropdownId={dropdownId}
              dropdownPlacement="bottom-start"
              clickableComponentWidth="100%"
              onOpen={handleOpenDropdown}
              dropdownOffset={{
                y: parseInt(theme.spacing[1], 10),
              }}
              clickableComponent={
                <div {...stylex.props(styles.formSelectContainerWrapper)}>
                  <FormFieldInputInnerContainer
                    formFieldInputInstanceId={componentId}
                    hasRightElement={isDefined(VariablePicker) && !readonly}
                    hoverable
                    preventFocusStackUpdate={true}
                  >
                    {chips}
                    <div {...stylex.props(styles.iconButton)}>
                      <IconChevronDown
                        size={theme.icon.size.md}
                        color={theme.font.color.light}
                      />
                    </div>
                  </FormFieldInputInnerContainer>
                </div>
              }
              dropdownComponents={
                <MultipleRecordPicker
                  componentInstanceId={dropdownId}
                  focusId={dropdownId}
                  onChange={handleMorphItemChange}
                  onSubmit={() => closeDropdown(dropdownId)}
                  onClickOutside={() => closeDropdown(dropdownId)}
                  dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
                />
              }
            />
          </div>
        )}
        {isDefined(VariablePicker) && !readonly && (
          <div {...stylex.props(styles.variablePickerContainer)}>
            <VariablePicker
              instanceId={variablesDropdownId}
              disabled={readonly}
              onVariableSelect={handleVariableTagInsert}
              shouldDisplayRecordObjects={true}
              shouldDisplayRecordFields={true}
              objectNameSingularsToSelect={[objectNameSingular]}
            />
          </div>
        )}
      </FormFieldInputRowContainer>
    </FormFieldInputContainer>
  );
};
