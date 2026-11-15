import * as stylex from '@stylexjs/stylex';

import {
  borderColor,
  borderRadius,
  spacing,
} from '../../../theme/tokens.stylex';

export const colorSampleVars = stylex.defineVars({
  '--color-sample-color': 'transparent',
  '--color-sample-border-color': borderColor['--t-border-color-strong'],
});

export const colorSampleStyles = stylex.create({
  root: {
    backgroundColor: colorSampleVars['--color-sample-color'],
    blockSize: spacing['--t-spacing-4'],
    borderColor: colorSampleVars['--color-sample-border-color'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'content-box',
    display: 'block',
    flexShrink: 0,
    inlineSize: spacing['--t-spacing-3'],
  },
  circle: {
    borderRadius: '50%',
    inlineSize: spacing['--t-spacing-4'],
  },
});
