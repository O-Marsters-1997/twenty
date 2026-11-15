import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { popoverStyles } from '../Popover.stylex';
import { type PopoverArrowProps } from '../types/PopoverArrowProps';

export const PopoverArrow = ({
  className,
  xstyle,
  ...props
}: WithXstyle<PopoverArrowProps>) => (
  <PopoverPrimitive.Arrow
    {...props}
    {...mergeStylexProps(stylex.props(popoverStyles.arrow, xstyle), className)}
  />
);
