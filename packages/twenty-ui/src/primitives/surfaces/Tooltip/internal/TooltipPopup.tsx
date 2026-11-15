import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tooltipStyles } from '../Tooltip.stylex';
import { type TooltipPopupProps } from '../types/TooltipPopupProps';

export const TooltipPopup = ({
  className,
  xstyle,
  withExitAnimation = false,
  ...props
}: WithXstyle<TooltipPopupProps>) => (
  <TooltipPrimitive.Popup
    role="tooltip"
    data-with-exit-animation={withExitAnimation || undefined}
    {...props}
    {...mergeStylexProps(
      stylex.props(
        tooltipStyles.popup,
        withExitAnimation && tooltipStyles.exitAnimation,
        xstyle,
      ),
      className,
    )}
  />
);
