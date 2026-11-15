import { type Input as InputPrimitive } from '@base-ui/react/input';
import { type StyleXStyles } from '@stylexjs/stylex';

import { type InputSize } from '@ui/primitives/input/types/InputSize';

export type InputProps = Omit<InputPrimitive.Props, 'size'> & {
  size?: InputSize;
  xstyle?: StyleXStyles;
};
