import { type Input as InputPrimitive } from '@base-ui/react/input';
import { type useRender } from '@base-ui/react/use-render';
import { type StyleXStyles } from '@stylexjs/stylex';

import { type InputSize } from '@ui/primitives/input/types/InputSize';

export type TextareaProps = Omit<
  useRender.ComponentProps<
    'textarea',
    InputPrimitive.State,
    useRender.ElementProps<'textarea'>
  >,
  'className'
> & {
  className?: string | ((state: InputPrimitive.State) => string | undefined);
  onValueChange?: (
    value: string,
    eventDetails: InputPrimitive.ChangeEventDetails,
  ) => void;
  size?: InputSize;
  autoResize?: boolean;
  maxRows?: number;
  xstyle?: StyleXStyles;
};
