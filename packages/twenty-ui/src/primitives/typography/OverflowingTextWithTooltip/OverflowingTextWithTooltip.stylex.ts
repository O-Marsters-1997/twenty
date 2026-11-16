import * as stylex from '@stylexjs/stylex';

export const overflowingTextStyles = stylex.create({
  text: {
    blockSize: 'auto',
    cursor: {
      default: 'inherit',
      ':is([data-content-overflowing])': 'pointer',
    },
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    maxInlineSize: '100%',
    textDecoration: 'inherit',
  },
  multiline: {
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  multilineTooltip: {
    fontFamily: 'inherit',
    whiteSpace: 'pre-wrap',
  },
});
