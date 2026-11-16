import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tooltipStyles } from '../Tooltip.stylex';
import { type TooltipPositionerProps } from '../types/TooltipPositionerProps';

export const TooltipPositioner = ({
  className,
  xstyle,
  ...props
}: WithXstyle<TooltipPositionerProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <TooltipPrimitive.Positioner
      dir={direction}
      {...props}
      {...mergeStylexProps(
        stylex.props(tooltipStyles.positioner, xstyle),
        className,
      )}
    />
  );
};
