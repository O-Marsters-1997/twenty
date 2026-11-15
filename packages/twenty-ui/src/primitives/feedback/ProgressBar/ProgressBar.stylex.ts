import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  animationDuration,
  borderRadius,
  fontColor,
  spacing,
} from '../../../theme/tokens.stylex';

export const progressBarVars = stylex.defineVars({
  '--progress-bar-background-color': 'transparent',
  '--progress-bar-color': fontColor['--t-font-color-primary'],
});

const indeterminate = stylex.keyframes({
  from: { transform: 'translateX(-100%)' },
  to: { transform: 'translateX(400%)' },
});

const isIndeterminate = ':is([data-indeterminate])';

export const progressBarStyles = stylex.create({
  bar: {
    backgroundColor: progressBarVars['--progress-bar-background-color'],
    blockSize: spacing['--t-spacing-2'],
    borderRadius: 0,
    inlineSize: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  barSm: { blockSize: spacing['--t-spacing-1_5'] },
  rounded: { borderRadius: borderRadius['--t-border-radius-pill'] },
  track: {
    blockSize: '100%',
    inlineSize: '100%',
    position: 'relative',
  },
  indicator: {
    animationDuration: {
      default: null,
      [isIndeterminate]: `calc(${animationDuration['--t-animation-duration-normal']} * 5s)`,
    },
    animationIterationCount: { default: null, [isIndeterminate]: 'infinite' },
    animationName: {
      default: null,
      [isIndeterminate]: {
        default: indeterminate,
        [media.reducedMotion]: 'none',
      },
    },
    animationTimingFunction: {
      default: null,
      [isIndeterminate]: 'ease-in-out',
    },
    backgroundColor: progressBarVars['--progress-bar-color'],
    blockSize: '100%',
    borderRadius: 0,
    inlineSize: { default: null, [isIndeterminate]: '25%' },
    minInlineSize: {
      default: null,
      ':is([data-minimum-fill])': 'min(12px, 50%)',
    },
    overflow: 'hidden',
    position: 'relative',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: { default: 'width', [media.reducedMotion]: 'none' },
    transitionTimingFunction: 'linear',
  },
  indicatorRounded: { borderRadius: borderRadius['--t-border-radius-pill'] },
});
