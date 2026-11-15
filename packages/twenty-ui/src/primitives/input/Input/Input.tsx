import { Input as InputPrimitive } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { InputGroupContext } from '@ui/primitives/input/InputGroup/internal/InputGroupContext';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { inputStyles } from './Input.stylex';
import { type InputProps } from './types/InputProps';

export const Input = ({ size, className, xstyle, ...props }: InputProps) => {
  const inputGroup = useContext(InputGroupContext);
  const resolvedSize = size ?? inputGroup?.size ?? 'md';

  return (
    <InputPrimitive
      {...props}
      {...mergeStylexProps(
        stylex.props(
          inputStyles.input,
          resolvedSize === 'sm' && inputStyles.sizeSm,
          isDefined(inputGroup) && inputStyles.grouped,
          xstyle,
        ),
        className,
      )}
    />
  );
};
