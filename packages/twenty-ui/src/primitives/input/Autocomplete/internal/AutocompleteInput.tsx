import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { InputGroupContext } from '@ui/primitives/input/InputGroup/internal/InputGroupContext';
import { inputStyles } from '@ui/primitives/input/Input/Input.stylex';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { type AutocompleteInputProps } from '../types/AutocompleteInputProps';

export const AutocompleteInput = ({
  size,
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteInputProps>) => {
  const inputGroup = useContext(InputGroupContext);
  const resolvedSize = size ?? inputGroup?.size ?? 'md';

  return (
    <AutocompletePrimitive.Input
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
