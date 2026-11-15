import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';

export const toasterVars = stylex.defineVars({
  '--toaster-offset': {
    default: '40px',
    [media.mobile]: '-40px',
  },
});
