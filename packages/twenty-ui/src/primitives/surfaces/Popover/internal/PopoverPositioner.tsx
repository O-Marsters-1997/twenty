import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { popoverStyles } from '../Popover.stylex';
import { type PopoverPositionerProps } from '../types/PopoverPositionerProps';

export const PopoverPositioner = ({
  className,
  xstyle,
  sideOffset = 8,
  ...props
}: WithXstyle<PopoverPositionerProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <PopoverPrimitive.Positioner
      dir={direction}
      sideOffset={sideOffset}
      {...props}
      {...mergeStylexProps(
        stylex.props(popoverStyles.positioner, xstyle),
        className,
      )}
    />
  );
};
