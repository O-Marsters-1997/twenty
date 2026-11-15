import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';

import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { FormFieldPlaceholder } from '@/object-record/record-field/ui/form-types/components/FormFieldPlaceholder';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { type FieldMultiSelectValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { MultiSelectDisplay } from '@/ui/field/display/components/MultiSelectDisplay';
import { MultiSelectInput } from '@/ui/field/input/components/MultiSelectInput';
import { Field, type SelectOption } from 'twenty-ui/primitives/input';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { isStandaloneVariableString } from 'twenty-shared/workflow';
import { isArray, isNonEmptyString } from '@sniptt/guards';
import { useId, useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { preventDropdownDismissOnInputElement } from '@/ui/layout/dropdown/utils/preventDropdownDismissOnInputElement';
import { IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type FormMultiSelectFieldInputProps = {
  label?: string;
  defaultValue: FieldMultiSelectValue | string | undefined;
  options: SelectOption[];
  onChange: (value: FieldMultiSelectValue | string) => void;
  VariablePicker?: VariablePickerComponent;
  readonly?: boolean;
  placeholder?: string;
  testId?: string;
  hint?: string;
  dropdownWidth?: number;
};

const StyledMultiSelectDisplay = styled(MultiSelectDisplay)`
  flex-wrap: wrap;
`;

const styles = stylex.create({
  rowContainer: {
    height: 'auto',
    minHeight: 32,
  },
  displayModeReadonlyContainer: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    display: 'flex',
    fontFamily: 'inherit',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
  displayModeContainer: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
  placeholderContainer: {
    width: '100%',
  },
});

const safeParsedValue = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const FormMultiSelectFieldInput = ({
  label,
  defaultValue,
  options,
  onChange,
  VariablePicker,
  readonly,
  placeholder,
  testId,
  hint,
  dropdownWidth,
}: FormMultiSelectFieldInputProps) => {
  const theme = useTheme();
  const instanceId = useId();
  const { closeDropdown } = useCloseDropdown();

  const [draftValue, setDraftValue] = useState<
    | {
        type: 'static';
        value: FieldMultiSelectValue | string;
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
          value: isDefined(defaultValue) ? defaultValue : [],
        },
  );

  const onOptionSelected = (value: FieldMultiSelectValue) => {
    if (draftValue.type !== 'static') {
      throw new Error('Can only be called when editing a static value');
    }

    setDraftValue({
      type: 'static',
      value,
    });

    onChange(value);
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

    onChange([]);
  };

  const selectedNames =
    draftValue.type === 'static' && isDefined(draftValue.value)
      ? isArray(draftValue.value)
        ? draftValue.value
        : safeParsedValue(draftValue.value)
      : undefined;

  const selectedOptions =
    isDefined(selectedNames) && isDefined(options) && isArray(selectedNames)
      ? options.filter((option) =>
          selectedNames.some((name) => option.value === name),
        )
      : undefined;

  const placeholderText = placeholder ?? label;
  const accessibleLabel =
    [label, placeholder].find(isNonEmptyString) ?? t`Select options`;

  return (
    <FormFieldInputContainer data-testid={testId}>
      {label ? <Field.Label>{label}</Field.Label> : null}

      <FormFieldInputRowContainer xstyle={styles.rowContainer}>
        <FormFieldInputInnerContainer
          formFieldInputInstanceId={instanceId}
          hasRightElement={isDefined(VariablePicker) && !readonly}
          hoverable={!readonly}
          preventFocusStackUpdate={draftValue.type === 'static' && !readonly}
        >
          {draftValue.type === 'static' ? (
            readonly ? (
              <div {...stylex.props(styles.displayModeReadonlyContainer)}>
                {isNonEmptyArray(selectedOptions) ? (
                  <StyledMultiSelectDisplay
                    values={selectedNames}
                    options={selectedOptions}
                  />
                ) : (
                  <div {...stylex.props(styles.placeholderContainer)}>
                    <FormFieldPlaceholder />
                  </div>
                )}
                <IconChevronDown
                  size={theme.icon.size.md}
                  color={theme.font.color.light}
                />
              </div>
            ) : (
              <DropdownRoot
                dropdownId={instanceId}
                type="picker"
                multiple
                onInteractOutside={preventDropdownDismissOnInputElement}
              >
                <Dropdown.Trigger
                  render={
                    <div {...stylex.props(styles.displayModeContainer)} />
                  }
                  nativeButton={false}
                  aria-label={accessibleLabel}
                >
                  {isNonEmptyArray(selectedOptions) ? (
                    <StyledMultiSelectDisplay
                      values={selectedNames}
                      options={selectedOptions}
                    />
                  ) : (
                    <div {...stylex.props(styles.placeholderContainer)}>
                      <FormFieldPlaceholder>
                        {placeholderText}
                      </FormFieldPlaceholder>
                    </div>
                  )}
                  <IconChevronDown
                    size={theme.icon.size.md}
                    color={theme.font.color.tertiary}
                  />
                </Dropdown.Trigger>
                <DropdownContent
                  align="start"
                  sideOffset={parseInt(theme.spacing[1], 10)}
                  width={
                    dropdownWidth ?? GenericDropdownContentWidth.ExtraLarge
                  }
                  aria-label={accessibleLabel}
                >
                  <MultiSelectInput
                    options={options}
                    onOptionSelected={onOptionSelected}
                    onEnter={() => closeDropdown(instanceId)}
                    values={selectedNames}
                  />
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

        {isDefined(VariablePicker) && !readonly && (
          <VariablePicker
            instanceId={instanceId}
            onVariableSelect={handleVariableTagInsert}
          />
        )}
      </FormFieldInputRowContainer>
      {hint ? <Field.Description>{hint}</Field.Description> : null}
    </FormFieldInputContainer>
  );
};
