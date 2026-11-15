import * as stylex from '@stylexjs/stylex';

export const numberFieldStyles = stylex.create({
  readOnly: {
    '--tw-button-active': 'var(--tw-button-background)',
    '--tw-button-hover': 'var(--tw-button-background)',
    cursor: 'default',
    opacity: 0.5,
  },
});
