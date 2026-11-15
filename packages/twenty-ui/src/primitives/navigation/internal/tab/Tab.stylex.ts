import * as stylex from '@stylexjs/stylex';

import { fontColor, spacing } from '../../../../theme/tokens.stylex';

export const tabsVars = stylex.defineVars({
  '--tw-tabs-color': fontColor['--t-font-color-secondary'],
  '--tw-tabs-icon-color': fontColor['--t-font-color-secondary'],
  '--tw-tabs-background': 'transparent',
  '--tw-tabs-padding-block': spacing['--t-spacing-1'],
});

export const tabMarker = stylex.defineMarker();
