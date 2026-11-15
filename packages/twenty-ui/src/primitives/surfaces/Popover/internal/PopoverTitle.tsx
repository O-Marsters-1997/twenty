import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { popoverStyles } from '../Popover.stylex';
import { type PopoverTitleProps } from '../types/PopoverTitleProps';

export const PopoverTitle = ({
  className,
  xstyle,
  ...props
}: WithXstyle<PopoverTitleProps>) => (
  <PopoverPrimitive.Title
    {...props}
    {...mergeStylexProps(stylex.props(popoverStyles.title, xstyle), className)}
  />
);
