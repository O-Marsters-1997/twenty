import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { media } from '../../../../theme/constants.stylex';
import { animationDuration } from '../../../../theme/tokens.stylex';
import { type CollapsiblePanelProps } from '../types/CollapsiblePanelProps';

export const CollapsiblePanel = ({
  dimension = 'height',
  containAnimation = true,
  duration = 'normal',
  className,
  xstyle,
  ...props
}: WithXstyle<CollapsiblePanelProps>) => (
  <CollapsiblePrimitive.Panel
    data-dimension={dimension}
    data-duration={duration}
    {...props}
    {...mergeStylexProps(
      stylex.props(
        styles.panel,
        durationStyles[duration],
        dimensionStyles[dimension],
        containAnimation && styles.contained,
        containAnimation && dimension === 'height' && styles.containedHeight,
        xstyle,
      ),
      className,
    )}
  />
);

const styles = stylex.create({
  panel: {
    display: {
      default: null,
      ':is([hidden]:not([hidden="until-found"]))': 'none',
    },
    opacity: {
      default: 1,
      ':is([data-starting-style], [data-ending-style])': 0,
    },
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease-in-out',
  },
  contained: {
    display: {
      default: 'flex',
      ':is([hidden]:not([hidden="until-found"]))': 'none',
    },
    flexDirection: 'column',
    overflow: 'hidden',
  },
  containedHeight: { width: '100%' },
});

const durationStyles = stylex.create({
  instant: {
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
  },
  fast: {
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
  },
  normal: {
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
  },
  slow: {
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-slow']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
  },
});

const dimensionStyles = stylex.create({
  height: {
    height: {
      default: 'var(--collapsible-panel-height)',
      ':is([data-starting-style], [data-ending-style])': 0,
    },
    transitionProperty: 'height, opacity',
  },
  width: {
    transitionProperty: 'width, opacity',
    width: {
      default: 'var(--collapsible-panel-width)',
      ':is([data-starting-style], [data-ending-style])': 0,
    },
  },
});
