import * as stylex from '@stylexjs/stylex';

import { borderColor } from '../../../theme/tokens.stylex';

export const tabButtonStyles = stylex.create({
  button: {
    backgroundColor: 'transparent',
    blockSize: 'auto',
    borderRadius: 0,
    borderStyle: 'none',
    borderWidth: 0,
    color: 'var(--tw-tabs-color)',
    opacity: 1,
    paddingBlock: 0,
    paddingInline: 0,
    '::after': {
      backgroundColor: 'transparent',
      blockSize: '1px',
      content: '""',
      insetBlockEnd: 0,
      insetInline: 0,
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 1,
    },
  },
  active: {
    '::after': {
      backgroundColor: borderColor['--t-border-color-inverted'],
    },
  },
});
