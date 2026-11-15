import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { tooltipStyles } from '../Tooltip.stylex';

import '../Tooltip.css';

type TooltipBodyProps = {
  children: ReactNode;
  description?: ReactNode;
  startIcon?: ReactNode;
};

export const TooltipBody = ({
  children,
  description,
  startIcon,
}: TooltipBodyProps) => (
  <div {...stylex.props(tooltipStyles.content)}>
    {isRenderableSlot(children) && (
      <div {...stylex.props(tooltipStyles.title)}>
        {isRenderableSlot(startIcon) && (
          <span
            {...mergeStylexProps(
              stylex.props(tooltipStyles.icon),
              'tw-tooltip-icon',
            )}
            aria-hidden
          >
            {startIcon}
          </span>
        )}
        <span {...stylex.props(tooltipStyles.titleText)}>{children}</span>
      </div>
    )}
    {isRenderableSlot(description) && (
      <div {...stylex.props(tooltipStyles.description)}>{description}</div>
    )}
  </div>
);
