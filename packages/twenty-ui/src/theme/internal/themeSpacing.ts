// Generated from design-tokens by scripts/generateThemeTokens.ts.
// Do not edit manually. Regenerate with: npx moon run twenty-ui:generate-tokens.
export const themeSpacing = (...multiplicators: number[]): string =>
  multiplicators.map((multiplicator) => `${multiplicator * 4}px`).join(' ');
