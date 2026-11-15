import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tooltipStyles } from '../Tooltip.stylex';
import { type TooltipArrowProps } from '../types/TooltipArrowProps';

export const TooltipArrow = ({
  className,
  xstyle,
  ...props
}: WithXstyle<TooltipArrowProps>) => (
  <TooltipPrimitive.Arrow
    {...props}
    {...mergeStylexProps(stylex.props(tooltipStyles.arrow, xstyle), className)}
  />
);
