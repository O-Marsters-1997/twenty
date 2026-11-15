import * as stylex from '@stylexjs/stylex';

import { borderRadius, spacing } from '../../../theme/tokens.stylex';
import { buttonVars } from '../../input/Button/Button.stylex';

const loaderDot = stylex.keyframes({
  '0%': { blockSize: 8, inlineSize: 8, transform: 'translateX(-16px)' },
  '15%': { blockSize: 2, inlineSize: 12, transform: 'translateX(0)' },
  '30%': { blockSize: 8, inlineSize: 8, transform: 'translateX(16px)' },
  '100%': { blockSize: 8, inlineSize: 8, transform: 'translateX(16px)' },
});

export const loaderStyles = stylex.create({
  container: {
    alignItems: 'center',
    blockSize: spacing['--t-spacing-3'],
    borderColor: buttonVars['--tw-button-color'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    inlineSize: spacing['--t-spacing-6'],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  containerColor: (color: string) => ({ borderColor: color }),
  dot: {
    animationDuration: '0.8s',
    animationIterationCount: 'infinite',
    animationName: loaderDot,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: buttonVars['--tw-button-color'],
    blockSize: 8,
    borderRadius: borderRadius['--t-border-radius-pill'],
    inlineSize: 8,
  },
  dotColor: (color: string) => ({ backgroundColor: color }),
});
