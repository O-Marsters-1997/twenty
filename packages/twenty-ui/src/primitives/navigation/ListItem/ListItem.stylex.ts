import * as stylex from '@stylexjs/stylex';

import { backgroundTransparent, fontColor } from '../../../theme/tokens.stylex';

export const listItemVars = stylex.defineVars({
  '--tw-list-item-color': fontColor['--t-font-color-secondary'],
  '--tw-list-item-description-color': fontColor['--t-font-color-secondary'],
  '--tw-list-item-background': 'transparent',
  '--tw-list-item-hover-background':
    backgroundTransparent['--t-background-transparent-light'],
});

export const listItemMarker = stylex.defineMarker();
