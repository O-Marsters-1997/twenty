// Generated from design-tokens by scripts/generateThemeTokens.ts.
// Do not edit manually. Regenerate with: npx nx generateTokens twenty-ui.
import * as stylex from '@stylexjs/stylex';

export const media = stylex.defineConsts({
  mobile: '@media (max-width: 768px)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  print: '@media print',
  hoverCapable: '@media (hover: hover)',
  hoverCapableWithoutTouch:
    '@media (hover: hover) and (not (any-pointer: coarse))',
});
