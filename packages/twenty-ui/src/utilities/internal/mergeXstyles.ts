import { type StyleXStyles } from '@stylexjs/stylex';

export const mergeXstyles = (...entries: readonly unknown[]): StyleXStyles =>
  entries as StyleXStyles;
