import * as stylex from '@stylexjs/stylex';

export const logConsoleQueries = stylex.defineConsts({
  narrowBody: '@container log-console-body (max-width: 880px)',
  motionAllowed: '@media (prefers-reduced-motion: no-preference)',
});

export const logConsoleEasing = stylex.defineConsts({
  standard: 'cubic-bezier(0.33, 1, 0.68, 1)',
});

export const logConsoleRowMarker = stylex.defineMarker();
