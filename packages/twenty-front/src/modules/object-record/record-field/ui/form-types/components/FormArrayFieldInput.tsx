import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { FormFieldPlaceholder } from '@/object-record/record-field/ui/form-types/components/FormFieldPlaceholder';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { ArrayFieldMenuItem } from '@/object-record/record-field/ui/meta-types/input/components/ArrayFieldMenuItem';
import { MultiItemBaseInput } from '@/object-record/record-field/ui/meta-types/input/components/MultiItemBaseInput';
import { type FieldArrayValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { ArrayDisplay } from '@/ui/field/display/components/ArrayDisplay';
import { StyledTextInput } from '@/ui/field/input/components/TextInput';
import { Field } from 'twenty-ui/primitives/input';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isStandaloneVariableString } from 'twenty-shared/workflow';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyArray, isNonEmptyString } from '@sniptt/guards';
import { type FocusEvent, type KeyboardEvent, useId, useState } from 'react';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { Dropdown } from 'twenty-ui/components/navigation';
import { useTheme } from 'twenty-ui/theme';
import { toSpliced } from '~/utils/array/toSpliced';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, spacing } from 'twenty-ui/theme/tokens.stylex';

type FormArrayFieldInputProps = {
  label?: string;
  defaultValue: FieldArrayValue | string | undefined;
  onChange: (value: FieldArrayValue | string) => void;
  VariablePicker?: VariablePickerComponent;
  readonly?: boolean;
  placeholder?: string;
  testId?: string;
  maxItemCount?: number;
};

const styles = stylex.create({
  displayModeContainer: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    borderStyle: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    height: 30,
    paddingInline: spacing['--t-spacing-2'],
    width: '100%',
  },
  displayModeContainerOpen: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
  displayModeReadonlyContainer: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    display: 'flex',
    fontFamily: 'inherit',
    paddingInline: spacing['--t-spacing-2'],
    width: '100%',
  },
  inputContainer: {
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  placeholderContainer: {
    width: '100%',
  },
});

export const FormArrayFieldInput = ({
  label,
  defaultValue,
  onChange,
  VariablePicker,
  readonly,
  placeholder,
  testId,
  maxItemCount,
}: FormArrayFieldInputProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const instanceId = useId();

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();
  const { closeDropdown } = useCloseDropdown();
  const { openDropdown } = useOpenDropdown();

  const [draftValue, setDraftValue] = useState<
    | {
        type: 'static';
        value: FieldArrayValue;
      }
    | {
        type: 'variable';
        value: string;
      }
  >(
    isStandaloneVariableString(defaultValue)
      ? {
          type: 'variable',
          value: defaultValue,
        }
      : {
          type: 'static',
          value:
            isDefined(defaultValue) && isNonEmptyArray(defaultValue)
              ? defaultValue
              : [],
        },
  );

  const [newItemDraftValue, setNewItemDraftValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isInputDisplayed, setIsInputDisplayed] = useState(false);
  const [itemToEditIndex, setItemToEditIndex] = useState(-1);
  const isAddingNewItem = itemToEditIndex === -1;

  const dropdownId = `dropdown-${instanceId}`;
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  const accessibleLabel = isNonEmptyString(label) ? label : t`Items`;

  const preventContainerFocusStackUpdate =
    draftValue.type === 'static' && draftValue.value.length >= 1;

  const isLimitReached =
    isDefined(maxItemCount) &&
    draftValue.type === 'static' &&
    draftValue.value.length >= maxItemCount;

  const formFieldInputInstanceId = `form-array-field-container-${instanceId}`;
  const newItemInputInstanceId = `array-field-input-new-item-${instanceId}`;

  const handleFirstItemInputChange = (value: string) => {
    setNewItemDraftValue(value);
  };

  const commitFirstItemDraft = () => {
    if (
      isLimitReached ||
      draftValue.type !== 'static' ||
      !isNonEmptyString(newItemDraftValue.trim())
    ) {
      return false;
    }

    const updatedItems = [...draftValue.value, newItemDraftValue.trim()];

    setDraftValue({
      type: 'static',
      value: updatedItems,
    });

    onChange(updatedItems);

    setNewItemDraftValue('');

    return true;
  };

  const handleRowBlur = (event: FocusEvent<HTMLDivElement>) => {
    const isFocusMovingOutsideRow =
      event.relatedTarget instanceof Node &&
      !event.currentTarget.contains(event.relatedTarget);

    if (isFocusMovingOutsideRow) {
      commitFirstItemDraft();
    }
  };

  const handleFirstItemInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== Key.Enter || event.nativeEvent.isComposing) {
      return;
    }

    event.stopPropagation();

    if (!commitFirstItemDraft()) {
      return;
    }

    openDropdown({
      dropdownComponentInstanceIdFromProps: dropdownId,
    });

    removeFocusItemFromFocusStackById({
      focusId: formFieldInputInstanceId,
    });
  };

  const handleEditItem = (index: number) => {
    setInputValue(draftValue.value[index]);
    setItemToEditIndex(index);
    setIsInputDisplayed(true);
  };

  const handleDeleteItem = (index: number) => {
    if (draftValue.type !== 'static') {
      throw new Error('Cannot delete item when value is a variable.');
    }

    const updatedItems = toSpliced(draftValue.value, index, 1);

    setDraftValue({
      type: 'static',
      value: updatedItems,
    });
    onChange(updatedItems);

    const isDropdownGoingToBeHiddenNext = updatedItems.length === 0;
    if (isDropdownGoingToBeHiddenNext) {
      closeDropdown(dropdownId);
    }
  };

  const handleNewItemInputFocus = () => {
    pushFocusItemToFocusStack({
      focusId: newItemInputInstanceId,
      component: {
        type: FocusComponentType.FORM_FIELD_INPUT,
        instanceId: newItemInputInstanceId,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });
  };

  const handleNewItemInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    const isFocusMovingToAnotherElement = event.relatedTarget instanceof Node;

    if (
      isAddingNewItem &&
      isFocusMovingToAnotherElement &&
      isNonEmptyString(inputValue.trim())
    ) {
      handleNewItemInputSubmit();
      return;
    }

    removeFocusItemFromFocusStackById({
      focusId: newItemInputInstanceId,
    });
  };

  const handleNewItemInputEscape = () => {
    closeDropdown(dropdownId);

    setIsInputDisplayed(false);
    setInputValue('');

    removeFocusItemFromFocusStackById({
      focusId: newItemInputInstanceId,
    });
  };

  const handleNewItemInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleNewItemInputSubmit = () => {
    if (draftValue.type !== 'static') {
      throw new Error('Cannot submit input when value is a variable.');
    }

    const sanitizedInput = inputValue.trim();

    if (sanitizedInput === '' && isAddingNewItem) {
      return;
    }

    if (sanitizedInput === '' && !isAddingNewItem) {
      handleDeleteItem(itemToEditIndex);
      return;
    }

    const items = draftValue.value;

    if (!isAddingNewItem && sanitizedInput === items[itemToEditIndex]) {
      setIsInputDisplayed(false);
      setInputValue('');
      return;
    }

    const updatedItems = isAddingNewItem
      ? [...items, sanitizedInput]
      : toSpliced(items, itemToEditIndex, 1, sanitizedInput);

    setDraftValue({
      type: 'static',
      value: updatedItems,
    });
    onChange(updatedItems);

    setIsInputDisplayed(false);
    setInputValue('');

    removeFocusItemFromFocusStackById({
      focusId: newItemInputInstanceId,
    });
  };

  const handleAddItemButtonClick = () => {
    if (isLimitReached) {
      return;
    }

    setItemToEditIndex(-1);
    setIsInputDisplayed(true);
  };

  const handleVariableTagInsert = (variableName: string) => {
    setDraftValue({
      type: 'variable',
      value: variableName,
    });

    onChange(variableName);
  };

  const handleUnlinkVariable = () => {
    setDraftValue({
      type: 'static',
      value: [],
    });

    setNewItemDraftValue('');

    onChange([]);
  };

  return (
    <FormFieldInputContainer data-testid={testId}>
      {label ? <Field.Label>{label}</Field.Label> : null}

      <FormFieldInputRowContainer onBlur={handleRowBlur}>
        <FormFieldInputInnerContainer
          formFieldInputInstanceId={formFieldInputInstanceId}
          preventFocusStackUpdate={preventContainerFocusStackUpdate}
          hasRightElement={isDefined(VariablePicker) && !readonly}
        >
          {draftValue.type === 'static' ? (
            readonly ? (
              <div {...stylex.props(styles.displayModeReadonlyContainer)}>
                {draftValue.value.length > 0 ? (
                  <ArrayDisplay value={draftValue.value} />
                ) : (
                  <div {...stylex.props(styles.placeholderContainer)}>
                    <FormFieldPlaceholder />
                  </div>
                )}
              </div>
            ) : draftValue.value.length === 0 ? (
              <div {...stylex.props(styles.inputContainer)}>
                <StyledTextInput
                  autoComplete="off"
                  placeholder={t`Enter an item`}
                  value={newItemDraftValue}
                  onChange={(event) =>
                    handleFirstItemInputChange(event.target.value)
                  }
                  onKeyDown={handleFirstItemInputKeyDown}
                />
              </div>
            ) : (
              <DropdownRoot dropdownId={dropdownId} type="panel">
                <Dropdown.Trigger
                  render={
                    <div
                      {...stylex.props(
                        styles.displayModeContainer,
                        isDropdownOpen && styles.displayModeContainerOpen,
                      )}
                    />
                  }
                  nativeButton={false}
                  aria-label={accessibleLabel}
                >
                  <ArrayDisplay value={draftValue.value} />
                </Dropdown.Trigger>
                <DropdownContent
                  side="bottom"
                  align="start"
                  sideOffset={parseInt(theme.spacing[1], 10)}
                  aria-label={accessibleLabel}
                >
                  <Dropdown.Section scrollable>
                    {draftValue.type === 'static' &&
                      draftValue.value.map((value, index) => (
                        <ArrayFieldMenuItem
                          key={index}
                          dropdownId={`array-field-input-${instanceId}-${index}`}
                          value={value}
                          onEdit={() => {
                            handleEditItem(index);
                          }}
                          onDelete={() => {
                            handleDeleteItem(index);
                          }}
                        />
                      ))}
                  </Dropdown.Section>

                  <Dropdown.Separator />

                  {isInputDisplayed ? (
                    <MultiItemBaseInput
                      instanceId={newItemInputInstanceId}
                      autoFocus
                      placeholder={placeholder}
                      value={inputValue}
                      onFocus={handleNewItemInputFocus}
                      onBlur={handleNewItemInputBlur}
                      onEscape={handleNewItemInputEscape}
                      onChange={handleNewItemInputChange}
                      onEnter={handleNewItemInputSubmit}
                      hasItem
                    />
                  ) : !isLimitReached ? (
                    <Dropdown.Section>
                      <Dropdown.ActionItem
                        onClick={handleAddItemButtonClick}
                        startIcon={<IconPlus />}
                        closeOnClick={false}
                      >{t`Add item`}</Dropdown.ActionItem>
                    </Dropdown.Section>
                  ) : null}
                </DropdownContent>
              </DropdownRoot>
            )
          ) : (
            <VariableChipStandalone
              rawVariableName={draftValue.value}
              onRemove={readonly ? undefined : handleUnlinkVariable}
            />
          )}
        </FormFieldInputInnerContainer>

        {VariablePicker && !readonly && (
          <VariablePicker
            instanceId={instanceId}
            onVariableSelect={handleVariableTagInsert}
          />
        )}
      </FormFieldInputRowContainer>
    </FormFieldInputContainer>
  );
};
