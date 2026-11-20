import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  Tooltip,
  type TooltipPositionerProps,
} from 'twenty-ui/primitives/surfaces';
import { borderRadius, boxShadow } from 'twenty-ui/theme/tokens.stylex';

type SuggestionItemPreviewTooltipProps = {
  anchor: TooltipPositionerProps['anchor'];
  width: number;
  children: ReactNode;
};

export const SuggestionItemPreviewTooltip = ({
  anchor,
  width,
  children,
}: SuggestionItemPreviewTooltipProps) => (
  <Tooltip.Root open>
    <Tooltip.Portal>
      <Tooltip.Positioner
        anchor={anchor}
        side="right"
        align="start"
        sideOffset={16}
        style={{ maxWidth: `${width}px` }}
        className={stylex.props(styles.positioner).className}
      >
        <Tooltip.Popup className={stylex.props(styles.popup).className}>
          {children}
        </Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>
);

const styles = stylex.create({
  positioner: {
    visibility: {
      default: null,
      ':is([data-anchor-hidden])': 'hidden',
    },
  },
  popup: {
    borderRadius: borderRadius['--t-border-radius-md'],
    paddingBlock: 0,
    paddingInline: 0,
    backgroundColor: 'transparent',
    boxShadow: boxShadow['--t-box-shadow-strong'],
  },
});
