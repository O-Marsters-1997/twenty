import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { popoverStyles } from '../Popover.stylex';
import { type PopoverPopupProps } from '../types/PopoverPopupProps';

export const PopoverPopup = ({
  className,
  xstyle,
  ...props
}: WithXstyle<PopoverPopupProps>) => (
  <PopoverPrimitive.Popup
    {...props}
    {...mergeStylexProps(stylex.props(popoverStyles.popup, xstyle), className)}
  />
);
