import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

export const itemsLayout = stylex.defineVars({
  padding: spacing['--t-spacing-1'],
  rowGap: '2px',
});

export const separatorMarker = stylex.defineMarker();
