import { useControlled } from '@base-ui/utils/useControlled';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import * as stylex from '@stylexjs/stylex';

import { IconMinus, IconPlus } from '@ui/icon';
import { Button } from '@ui/primitives/input/Button/Button';
import { type ButtonProps } from '@ui/primitives/input/Button/types/ButtonProps';
import { inputStyles } from '@ui/primitives/input/Input/Input.stylex';
import { NumberField } from '@ui/primitives/input/NumberField/NumberField';
import { numberFieldStyles } from '@ui/primitives/input/NumberField/NumberField.stylex';
import { type NumberFieldRootProps } from '@ui/primitives/input/NumberField/types/NumberFieldRootProps';
import { useTheme } from '@ui/theme';
import { mergeXstyles } from '@ui/utilities/internal/mergeXstyles';

import { fontWeight, spacing } from '../../../theme/tokens.stylex';
import { NUMBER_STEPPER_FORMAT } from './internal/constants/NumberStepperFormat';
import { isBlurRoundingOfCurrentValue } from './internal/utils/isBlurRoundingOfCurrentValue';
import { type NumberStepperProps } from './types/NumberStepperProps';

export const NumberStepper = ({
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  allowOutOfRange = false,
  min,
  max,
  step = 1,
  disabled,
  readOnly,
  required,
  name,
  form,
  id,
  showButtons = true,
  decrementLabel = 'Decrease value',
  incrementLabel = 'Increase value',
  className,
  ...props
}: NumberStepperProps) => {
  const theme = useTheme();
  const [resolvedValue, setResolvedValue] = useControlled({
    controlled: value,
    default: defaultValue ?? null,
    name: 'NumberStepper',
    state: 'value',
  });
  const currentValueRef = useValueAsRef(resolvedValue);

  const handleValueChange: NonNullable<
    NumberFieldRootProps['onValueChange']
  > = (nextValue, eventDetails) => {
    if (nextValue === currentValueRef.current) {
      return;
    }

    const isRoundingOnlyBlurChange = isBlurRoundingOfCurrentValue({
      nextValue,
      currentValue: currentValueRef.current,
      reason: eventDetails.reason,
    });

    if (isRoundingOnlyBlurChange) {
      eventDetails.cancel();
      return;
    }

    onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    currentValueRef.current = nextValue;
    setResolvedValue(nextValue);
  };

  return (
    <NumberField.Root
      value={resolvedValue}
      onValueChange={handleValueChange}
      onValueCommitted={onValueCommitted}
      min={min}
      max={max}
      allowOutOfRange={allowOutOfRange}
      step={step}
      smallStep={step}
      largeStep={step}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      form={form}
      id={id}
      format={NUMBER_STEPPER_FORMAT}
      {...stylex.props(styles.root)}
    >
      {showButtons && (
        <NumberField.Decrement
          aria-label={decrementLabel}
          render={(elementProps, state) => (
            <Button
              {...(elementProps as ButtonProps)}
              type="button"
              size="sm"
              xstyle={[
                styles.button,
                state.readOnly && numberFieldStyles.readOnly,
              ]}
              startIcon={
                <span {...stylex.props(styles.icon)}>
                  <IconMinus size={theme.icon.size.md} />
                </span>
              }
            />
          )}
        />
      )}
      <NumberField.Input
        {...props}
        form={form}
        className={className}
        xstyle={mergeXstyles(inputStyles.sizeSm, styles.valueInput)}
      />
      {showButtons && (
        <NumberField.Increment
          aria-label={incrementLabel}
          render={(elementProps, state) => (
            <Button
              {...(elementProps as ButtonProps)}
              type="button"
              size="sm"
              xstyle={[
                styles.button,
                state.readOnly && numberFieldStyles.readOnly,
              ]}
              startIcon={
                <span {...stylex.props(styles.icon)}>
                  <IconPlus size={theme.icon.size.md} />
                </span>
              }
            />
          )}
        />
      )}
    </NumberField.Root>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing['--t-spacing-1'],
  },
  valueInput: {
    boxSizing: 'border-box',
    fontWeight: fontWeight['--t-font-weight-medium'],
    inlineSize: spacing['--t-spacing-16'],
    textAlign: 'center',
  },
  button: {
    inlineSize: spacing['--t-spacing-6'],
    maxInlineSize: 'none',
    paddingInline: 0,
  },
  icon: { display: 'flex' },
});
