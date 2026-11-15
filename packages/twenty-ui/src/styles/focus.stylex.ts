import * as stylex from '@stylexjs/stylex';

import { color } from '../theme/tokens.stylex';

export const focusStyles = stylex.create({
  ring: {
    outlineColor: {
      default: null,
      ':focus-visible': color['--t-color-blue'],
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '1px',
    },
    outlineStyle: {
      default: null,
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: null,
      ':focus-visible': '2px',
    },
  },
});
