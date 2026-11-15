import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
import * as stylex from '@stylexjs/stylex';

import { inputStyles } from '@ui/primitives/input/Input/Input.stylex';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { type NumberFieldInputProps } from '../types/NumberFieldInputProps';

export const NumberFieldInput = ({
  className,
  xstyle,
  ...props
}: WithXstyle<NumberFieldInputProps>) => (
  <NumberFieldPrimitive.Input
    {...props}
    {...mergeStylexProps(stylex.props(inputStyles.input, xstyle), className)}
  />
);
