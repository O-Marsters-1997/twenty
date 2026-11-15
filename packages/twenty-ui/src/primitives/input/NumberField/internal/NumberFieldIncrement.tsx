import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';

import { Button } from '@ui/primitives/input/Button/Button';
import { type ButtonProps } from '@ui/primitives/input/Button/types/ButtonProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { numberFieldStyles } from '../NumberField.stylex';
import { type NumberFieldIncrementProps } from '../types/NumberFieldIncrementProps';

export const NumberFieldIncrement = ({
  className,
  xstyle,
  render,
  ...props
}: WithXstyle<NumberFieldIncrementProps>) => (
  <NumberFieldPrimitive.Increment
    {...props}
    className={className}
    render={
      render ??
      ((elementProps, state) => (
        <Button
          {...(elementProps as ButtonProps)}
          xstyle={[state.readOnly && numberFieldStyles.readOnly, xstyle]}
        />
      ))
    }
  />
);
