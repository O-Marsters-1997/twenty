import { createContext } from 'react';

import { type ButtonProps } from '@ui/primitives/input/Button/types/ButtonProps';

type ButtonGroupContextValue = Pick<
  ButtonProps,
  'variant' | 'color' | 'size'
> & {
  attached: boolean;
};

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(
  null,
);
