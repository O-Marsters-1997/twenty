import * as stylex from '@stylexjs/stylex';

import {
  background,
  backgroundTransparent,
  borderRadius,
  fontColor,
} from '../../../theme/tokens.stylex';

export const buttonVars = stylex.defineVars({
  '--tw-button-background':
    backgroundTransparent['--t-background-transparent-lighter'],
  '--tw-button-border':
    backgroundTransparent['--t-background-transparent-light'],
  '--tw-button-color': fontColor['--t-font-color-secondary'],
  '--tw-button-hover': background['--t-background-tertiary'],
  '--tw-button-active': background['--t-background-quaternary'],
  '--tw-button-radius': borderRadius['--t-border-radius-md'],
});

export const buttonMarker = stylex.defaultMarker();
