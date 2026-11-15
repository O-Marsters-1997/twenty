import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  background,
  backgroundTransparent,
} from '../../../theme/tokens.stylex';

const shimmer = stylex.keyframes({
  to: { transform: 'translateX(100%)' },
});

export const skeletonStyles = stylex.create({
  root: {
    '--skeleton-base-color': background['--t-background-tertiary'],
    '--skeleton-highlight-color':
      backgroundTransparent['--t-background-transparent-lighter'],
    backgroundColor: 'var(--skeleton-base-color)',
    borderRadius: '0.25rem',
    display: 'inline-flex',
    inlineSize: '100%',
    lineHeight: 1,
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  },
  layoutBlock: {
    blockSize: '1em',
    display: 'block',
  },
  animated: {
    '::after': {
      animationDuration: '1.5s',
      animationIterationCount: 'infinite',
      animationName: { default: shimmer, [media.reducedMotion]: 'none' },
      animationTimingFunction: 'ease-in-out',
      backgroundImage:
        'linear-gradient(90deg, var(--skeleton-base-color) 0%, var(--skeleton-highlight-color) 50%, var(--skeleton-base-color) 100%)',
      backgroundRepeat: 'no-repeat',
      blockSize: '100%',
      content: '" "',
      display: { default: 'block', [media.reducedMotion]: 'none' },
      insetBlockStart: 0,
      insetInline: 0,
      position: 'absolute',
      transform: 'translateX(-100%)',
    },
  },
});
