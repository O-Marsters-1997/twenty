import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { Field } from 'twenty-ui/primitives/input';
import { DatePicker } from '@/ui/input/components/internal/date/components/DatePicker';
import { DatePickerInput } from '@/ui/input/components/internal/date/components/DatePickerInput';
import { useIsDatePickerDropdownOpen } from '@/ui/input/components/internal/date/hooks/useIsDatePickerDropdownOpen';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';

import { OverlayContainer } from '@/ui/layout/overlay/components/OverlayContainer';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';

import { isStandaloneVariableString } from 'twenty-shared/workflow';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  useFloating,
} from '@floating-ui/react';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { useId, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { type Nullable } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';
import './FormDateFieldInput.css';

const FORM_DATE_FIELD_PICKER_CLICK_OUTSIDE_ID =
  'form-date-field-picker-floating';

const styles = stylex.create({
  dateInputTextContainer: {
    flex: '1',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
    width: '100%',
  },
  dateInputTextContainerReadonly: {
    pointerEvents: 'none',
    userSelect: 'none',
  },
  datePickerInputWrapper: {
    flex: '1',
    display: 'flex',
    minWidth: '0',
  },
});

type DraftValue =
  | {
      type: 'static';
      value: string | null;
      mode: 'view' | 'edit';
    }
  | {
      type: 'variable';
      value: string;
    };

type FormDateFieldInputProps = {
  label?: string;
  defaultValue: string | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  VariablePicker?: VariablePickerComponent;
  readonly?: boolean;
  variant?: FormFieldInputVariant;
};

export const FormDateFieldInput = ({
  label,
  defaultValue,
  onChange,
  VariablePicker,
  readonly,
  variant = 'default',
}: FormDateFieldInputProps) => {
  const instanceId = useId();

  const [draftValue, setDraftValue] = useState<DraftValue>(
    isStandaloneVariableString(defaultValue)
      ? {
          type: 'variable',
          value: defaultValue,
        }
      : {
          type: 'static',
          value: defaultValue ?? null,
          mode: 'view',
        },
  );

  const datePickerWrapperRef = useRef<HTMLDivElement>(null);

  const displayDatePicker =
    draftValue.type === 'static' && draftValue.mode === 'edit';

  const { refs, floatingStyles } = useFloating({
    open: displayDatePicker,
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [offset(4), flip()],
    whileElementsMounted: autoUpdate,
  });

  const persistDate = (newDate: Nullable<string>) => {
    if (!isDefined(newDate)) {
      onChange(null);
    } else {
      onChange(newDate);
    }
  };

  const { isDatePickerDropdownOpen } = useIsDatePickerDropdownOpen();

  useListenClickOutside({
    refs: [datePickerWrapperRef],
    listenerId: `FormDateFieldInputBase-${instanceId}`,
    callback: (event) => {
      if (isDatePickerDropdownOpen(instanceId)) {
        return;
      }

      event.stopImmediatePropagation();

      handlePickerClickOutside();
    },
    enabled: displayDatePicker,
    excludedClickOutsideIds: [FORM_DATE_FIELD_PICKER_CLICK_OUTSIDE_ID],
  });

  const handlePickerChange = (newDate: Nullable<string>) => {
    setDraftValue({
      type: 'static',
      mode: 'edit',
      value: newDate ?? null,
    });

    persistDate(newDate);
  };

  const handlePickerEnter = () => {};

  const handlePickerEscape = () => {
    setDraftValue({
      type: 'static',
      value: draftValue.value,
      mode: 'view',
    });
  };

  const handlePickerClickOutside = () => {
    setDraftValue({
      type: 'static',
      value: draftValue.value,
      mode: 'view',
    });
  };

  const handlePickerClear = () => {
    setDraftValue({
      type: 'static',
      value: null,
      mode: 'view',
    });

    persistDate(null);
  };

  const handlePickerMouseSelect = (newDate: Nullable<string>) => {
    setDraftValue({
      type: 'static',
      value: newDate ?? null,
      mode: 'view',
    });

    persistDate(newDate);
  };

  const handleInputChange = (newDate: string | null) => {
    if (!isDefined(newDate)) {
      return;
    }

    setDraftValue({
      type: 'static',
      mode: 'edit',
      value: newDate,
    });

    persistDate(newDate);
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
      value: null,
      mode: 'view',
    });

    onChange(null);
  };

  useHotkeysOnFocusedElement({
    keys: [Key.Escape],
    callback: handlePickerEscape,
    focusId: instanceId,
    dependencies: [handlePickerEscape],
  });

  const { userTimezone } = useUserTimezone();

  const isVariable = Boolean(isStandaloneVariableString(defaultValue));

  const plainDateValueFromProps =
    isVariable ||
    !isDefined(defaultValue) ||
    defaultValue === '' ||
    defaultValue === 'null'
      ? null
      : defaultValue.includes('T')
        ? Temporal.Instant.from(defaultValue)
            .toZonedDateTimeISO(userTimezone)
            .toPlainDate()
            .toString()
        : Temporal.PlainDate.from(defaultValue).toString();

  const plainDateValue =
    draftValue.type === 'static' ? draftValue.value : plainDateValueFromProps;

  const handleMaskedDatePointerDownCapture = () => {
    if (readonly) {
      return;
    }

    setDraftValue((previous) =>
      previous.type === 'static' && previous.mode === 'view'
        ? { ...previous, mode: 'edit' }
        : previous,
    );
  };

  return (
    <FormFieldInputContainer>
      {label ? <Field.Label>{label}</Field.Label> : null}

      <FormFieldInputRowContainer>
        <div
          ref={datePickerWrapperRef}
          {...stylex.props(styles.datePickerInputWrapper)}
        >
          <FormFieldInputInnerContainer
            ref={refs.setReference}
            formFieldInputInstanceId={instanceId}
            enableGlobalEscapeHotkeysConflictingWithKeyboard={false}
            hasRightElement={isDefined(VariablePicker) && !readonly}
            variant={variant}
          >
            {draftValue.type === 'static' ? (
              <div
                {...mergeClassName(
                  stylex.props(
                    styles.dateInputTextContainer,
                    readonly === true && styles.dateInputTextContainerReadonly,
                  ),
                  readonly === true
                    ? 'form-date-field-input-readonly'
                    : undefined,
                )}
                onPointerDownCapture={handleMaskedDatePointerDownCapture}
              >
                <DatePickerInput
                  date={plainDateValue}
                  onChange={handleInputChange}
                  readonly={readonly}
                  variant={variant}
                />
              </div>
            ) : (
              <VariableChipStandalone
                rawVariableName={draftValue.value}
                onRemove={readonly ? undefined : handleUnlinkVariable}
              />
            )}
          </FormFieldInputInnerContainer>
        </div>
        {draftValue.type === 'static' &&
        draftValue.mode === 'edit' &&
        !readonly ? (
          <FloatingPortal>
            <div
              data-floating-ui-viewport
              ref={refs.setFloating}
              style={floatingStyles}
              data-click-outside-id={FORM_DATE_FIELD_PICKER_CLICK_OUTSIDE_ID}
            >
              <OverlayContainer>
                <DatePicker
                  instanceId={instanceId}
                  plainDateString={plainDateValue}
                  onChange={handlePickerChange}
                  onClose={handlePickerMouseSelect}
                  onEnter={handlePickerEnter}
                  onEscape={handlePickerEscape}
                  onClear={handlePickerClear}
                  hideHeaderInput
                />
              </OverlayContainer>
            </div>
          </FloatingPortal>
        ) : null}
        {VariablePicker && !readonly ? (
          <VariablePicker
            instanceId={instanceId}
            onVariableSelect={handleVariableTagInsert}
          />
        ) : null}
      </FormFieldInputRowContainer>
    </FormFieldInputContainer>
  );
};
