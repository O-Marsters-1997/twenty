import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { popoverStyles } from '../Popover.stylex';
import { type PopoverDescriptionProps } from '../types/PopoverDescriptionProps';

export const PopoverDescription = ({
  className,
  xstyle,
  ...props
}: WithXstyle<PopoverDescriptionProps>) => (
  <PopoverPrimitive.Description
    {...props}
    {...mergeStylexProps(
      stylex.props(popoverStyles.description, xstyle),
      className,
    )}
  />
);
