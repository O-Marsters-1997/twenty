import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  animationDuration,
  background,
  borderColor,
  color,
  spacing,
} from '../../../theme/tokens.stylex';

export const progressRingVars = stylex.defineVars({
  '--progress-ring-color': color['--t-color-blue'],
});

const indeterminate = stylex.keyframes({
  to: { transform: 'rotate(270deg)' },
});

export const progressRingStyles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    gap: spacing['--t-spacing-2'],
    justifyContent: 'flex-end',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  ring: {
    animationDuration: {
      default: null,
      ':is([data-indeterminate])': `calc(${animationDuration['--t-animation-duration-normal']} * 5s)`,
    },
    animationIterationCount: {
      default: null,
      ':is([data-indeterminate])': 'infinite',
    },
    animationName: {
      default: null,
      ':is([data-indeterminate])': {
        default: indeterminate,
        [media.reducedMotion]: 'none',
      },
    },
    animationTimingFunction: {
      default: null,
      ':is([data-indeterminate])': 'linear',
    },
    display: 'inline-flex',
    flexShrink: 0,
    transform: 'rotate(-90deg)',
  },
  track: {
    fill: 'none',
    stroke: `color-mix(in srgb, ${borderColor['--t-border-color-strong']} 50%, ${background['--t-background-quaternary']} 50%)`,
  },
  indicator: {
    fill: 'none',
    stroke: progressRingVars['--progress-ring-color'],
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: {
      default: 'stroke-dashoffset',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease',
  },
});
