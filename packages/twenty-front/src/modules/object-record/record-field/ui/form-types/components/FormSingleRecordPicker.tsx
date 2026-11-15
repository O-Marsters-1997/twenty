import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { FormSingleRecordFieldChip } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordFieldChip';
import {
  type RecordId,
  type Variable,
} from '@/object-record/record-field/ui/form-types/types/RecordPickerValue';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { SingleRecordPicker } from '@/object-record/record-picker/single-record-picker/components/SingleRecordPicker';
import { singleRecordPickerSearchFilterComponentState } from '@/object-record/record-picker/single-record-picker/states/singleRecordPickerSearchFilterComponentState';
import { singleRecordPickerSelectedIdComponentState } from '@/object-record/record-picker/single-record-picker/states/singleRecordPickerSelectedIdComponentState';
import { type RecordPickerPickableMorphItem } from '@/object-record/record-picker/types/RecordPickerPickableMorphItem';
import { Field } from 'twenty-ui/primitives/input';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { isStandaloneVariableString } from 'twenty-shared/workflow';
import { t } from '@lingui/core/macro';
import { useCallback, useId } from 'react';
import { CustomError, isDefined, isValidUuid } from 'twenty-shared/utils';
import { IconChevronDown, IconForbid } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
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
    display: 'flex',
    flex: '1',
    minWidth: '0',
  },
  variablePickerContainer: {
    display: 'flex',
    flexShrink: '0',
  },
});

type FormSingleRecordPickerValue =
  | {
      type: 'static';
      value: RecordId;
    }
  | {
      type: 'variable';
      value: Variable;
    }
  | {
      type: 'no-record';
      value: null;
    };

export type FormSingleRecordPickerProps = {
  label?: string;
  defaultValue?: RecordId | Variable | null;
  onChange: (value: RecordId | Variable | null) => void;
  onClear?: () => void;
  onCreate?: (searchInput?: string) => void | Promise<void>;
  objectNameSingulars: string[];
  selectedObjectNameSingular?: string;
  onMorphItemSelected?: (
    selectedMorphItem: RecordPickerPickableMorphItem,
  ) => void;
  disabled?: boolean;
  testId?: string;
  VariablePicker?: VariablePickerComponent;
  shouldDisplayRecordFieldsInVariablePicker?: boolean;
};

export const FormSingleRecordPicker = ({
  label,
  defaultValue,
  objectNameSingulars,
  selectedObjectNameSingular,
  onChange,
  onClear,
  onMorphItemSelected,
  onCreate,
  disabled,
  testId,
  VariablePicker,
  shouldDisplayRecordFieldsInVariablePicker = false,
}: FormSingleRecordPickerProps) => {
  const theme = useTheme();

  const resolvedObjectNameSingular =
    selectedObjectNameSingular ?? objectNameSingulars[0];

  const draftValue: FormSingleRecordPickerValue =
    defaultValue === null
      ? { type: 'no-record', value: null }
      : isStandaloneVariableString(defaultValue)
        ? { type: 'variable', value: defaultValue }
        : { type: 'static', value: (defaultValue as string | undefined) ?? '' };

  if (objectNameSingulars.length === 0) {
    throw new CustomError(
      'Object is missing while building form single record picker',
      'FORM_SINGLE_RECORD_PICKER_OBJECT_NAME_SINGULAR_IS_MISSING',
    );
  }

  const { record: selectedRecord } = useFindOneRecord({
    objectRecordId:
      isDefined(defaultValue) && !isStandaloneVariableString(defaultValue)
        ? defaultValue
        : '',
    objectNameSingular: resolvedObjectNameSingular,
    withSoftDeleted: true,
    skip: !isDefined(defaultValue) || !isValidUuid(defaultValue),
  });

  const componentId = useId();
  const dropdownId = `form-record-picker-${componentId}`;
  const variablesDropdownId = `form-record-picker-${componentId}-variables`;

  const { closeDropdown } = useCloseDropdown();

  const setSingleRecordPickerSearchFilter = useSetAtomComponentState(
    singleRecordPickerSearchFilterComponentState,
    dropdownId,
  );

  const handleCloseRelationPickerDropdown = useCallback(() => {
    setSingleRecordPickerSearchFilter('');
  }, [setSingleRecordPickerSearchFilter]);

  const handleMorphItemSelected = (
    selectedMorphItem: RecordPickerPickableMorphItem | null | undefined,
  ) => {
    if (!isDefined(selectedMorphItem) || selectedMorphItem === null) {
      if (defaultValue === null) {
        onClear?.();
      } else {
        onChange(null);
      }
      closeDropdown(dropdownId);

      return;
    }

    if (defaultValue === selectedMorphItem.recordId) {
      onClear?.();
    } else if (isDefined(onMorphItemSelected)) {
      onMorphItemSelected(selectedMorphItem);
    } else {
      onChange(selectedMorphItem.recordId);
    }
    closeDropdown(dropdownId);
  };

  const handleCreateRecord = async (searchInput?: string) => {
    await onCreate?.(searchInput);
    closeDropdown(dropdownId);
  };

  const handleVariableTagInsert = (variable: string) => {
    onChange?.(variable);
  };

  const handleUnlinkVariable = (event?: React.MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation();
    onClear?.();
  };

  const setSingleRecordPickerSelectedId = useSetAtomComponentState(
    singleRecordPickerSelectedIdComponentState,
    dropdownId,
  );

  const handleOpenDropdown = () => {
    if (defaultValue === null) {
      setSingleRecordPickerSelectedId(undefined);
      return;
    }

    if (
      isDefined(draftValue.value) &&
      !isStandaloneVariableString(draftValue.value)
    ) {
      setSingleRecordPickerSelectedId(draftValue.value);
    }
  };

  return (
    <FormFieldInputContainer data-testid={testId}>
      {label ? <Field.Label>{label}</Field.Label> : null}
      <FormFieldInputRowContainer>
        {disabled ? (
          <div
            {...stylex.props(
              styles.formSelectContainerWrapper,
              styles.formSelectContainerWrapperReadonly,
            )}
          >
            <FormFieldInputInnerContainer
              formFieldInputInstanceId={componentId}
              hasRightElement={false}
            >
              <FormSingleRecordFieldChip
                draftValue={draftValue}
                selectedRecord={selectedRecord}
                objectNameSingular={resolvedObjectNameSingular}
                onRemove={handleUnlinkVariable}
                disabled={disabled}
              />
            </FormFieldInputInnerContainer>
          </div>
        ) : (
          <div {...stylex.props(styles.dropdownContainer)}>
            <Dropdown
              dropdownId={dropdownId}
              dropdownPlacement="bottom-start"
              clickableComponentWidth="100%"
              onClose={handleCloseRelationPickerDropdown}
              onOpen={handleOpenDropdown}
              dropdownOffset={{
                y: parseInt(theme.spacing[1], 10),
              }}
              clickableComponent={
                <div {...stylex.props(styles.formSelectContainerWrapper)}>
                  <FormFieldInputInnerContainer
                    formFieldInputInstanceId={componentId}
                    hasRightElement={isDefined(VariablePicker) && !disabled}
                    hoverable
                    preventFocusStackUpdate={true}
                  >
                    <FormSingleRecordFieldChip
                      draftValue={draftValue}
                      selectedRecord={selectedRecord}
                      objectNameSingular={resolvedObjectNameSingular}
                      onRemove={handleUnlinkVariable}
                      disabled={disabled}
                    />
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
                <SingleRecordPicker
                  focusId={dropdownId}
                  componentInstanceId={dropdownId}
                  EmptyIcon={IconForbid}
                  emptyLabel={t`No record`}
                  onCancel={() => closeDropdown(dropdownId)}
                  onCreate={
                    isDefined(onCreate) ? handleCreateRecord : undefined
                  }
                  onMorphItemSelected={handleMorphItemSelected}
                  objectNameSingulars={objectNameSingulars}
                  recordPickerInstanceId={dropdownId}
                  dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
                />
              }
            />
          </div>
        )}
        {isDefined(VariablePicker) && !disabled && (
          <div {...stylex.props(styles.variablePickerContainer)}>
            <VariablePicker
              instanceId={variablesDropdownId}
              disabled={disabled}
              onVariableSelect={handleVariableTagInsert}
              shouldDisplayRecordObjects={true}
              shouldDisplayRecordFields={
                shouldDisplayRecordFieldsInVariablePicker
              }
              objectNameSingularsToSelect={objectNameSingulars}
            />
          </div>
        )}
      </FormFieldInputRowContainer>
    </FormFieldInputContainer>
  );
};
