import { type CollectedTokenLeaf } from '../types/CollectedTokenLeaf';
import { GENERATED_TYPESCRIPT_HEADER } from './generatedTypeScriptHeader';
import { groupLeavesForStylex } from './groupLeavesForStylex';
import { quoteSingle } from './quoteSingle';

const renderVars = (
  leaves: CollectedTokenLeaf[],
  scheme: 'light' | 'dark',
): string =>
  leaves
    .map(
      (leaf) => `  ${quoteSingle(leaf.varName)}: ${quoteSingle(leaf[scheme])},`,
    )
    .join('\n');

export const buildStylexTokens = (leaves: CollectedTokenLeaf[]): string =>
  `${GENERATED_TYPESCRIPT_HEADER}
import * as stylex from '@stylexjs/stylex';

${[...groupLeavesForStylex(leaves)]
  .map(
    ([groupName, groupLeaves]) =>
      `export const ${groupName} = stylex.defineVars({\n${renderVars(groupLeaves, 'light')}\n});`,
  )
  .join('\n\n')}
`;

export const buildStylexThemes = (leaves: CollectedTokenLeaf[]): string => {
  const groups = [...groupLeavesForStylex(leaves)];
  return `${GENERATED_TYPESCRIPT_HEADER}
import * as stylex from '@stylexjs/stylex';

import { ${groups.map(([groupName]) => groupName).join(', ')} } from './tokens.stylex';

export const darkTheme = [
${groups
  .map(
    ([groupName, groupLeaves]) =>
      `  stylex.createTheme(${groupName}, {\n${renderVars(groupLeaves, 'dark')}\n  }),`,
  )
  .join('\n')}
];
`;
};

export const buildStylexConstants = (): string =>
  `${GENERATED_TYPESCRIPT_HEADER}
import * as stylex from '@stylexjs/stylex';

export const media = stylex.defineConsts({
  mobile: '@media (max-width: 768px)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  print: '@media print',
  hoverCapable: '@media (hover: hover)',
  hoverCapableWithoutTouch:
    '@media (hover: hover) and (not (any-pointer: coarse))',
});
`;
