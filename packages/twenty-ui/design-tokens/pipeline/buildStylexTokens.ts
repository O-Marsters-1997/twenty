import { type CollectedTokenLeaf } from '../types/CollectedTokenLeaf';
import { GENERATED_TYPESCRIPT_HEADER } from './generatedTypeScriptHeader';
import { groupLeavesForStylex } from './groupLeavesForStylex';
import { quoteSingle } from './quoteSingle';
import { selectSquircleDoubledRadiusLeaves } from './selectSquircleDoubledRadiusLeaves';

const SQUIRCLE_SUPPORTS_CONDITION = '@supports (corner-shape: squircle)';

const doubleSquircleRadius = (leaf: CollectedTokenLeaf): string => {
  const match = leaf.light.match(/^(\d+)px$/);
  if (match === null || leaf.light !== leaf.dark) {
    throw new Error(
      `Squircle-doubled radius token "${leaf.varName}" must be a scheme-invariant integer px value, got light "${leaf.light}" / dark "${leaf.dark}".`,
    );
  }
  return `${Number(match[1]) * 2}px`;
};

const renderVars = ({
  leaves,
  scheme,
  squircleVarNames,
}: {
  leaves: CollectedTokenLeaf[];
  scheme: 'light' | 'dark';
  squircleVarNames: Set<string>;
}): string =>
  leaves
    .map((leaf) => {
      const value = squircleVarNames.has(leaf.varName)
        ? `{ default: ${quoteSingle(leaf[scheme])}, ${quoteSingle(SQUIRCLE_SUPPORTS_CONDITION)}: ${quoteSingle(doubleSquircleRadius(leaf))} }`
        : quoteSingle(leaf[scheme]);
      return `  ${quoteSingle(leaf.varName)}: ${value},`;
    })
    .join('\n');

const collectSquircleVarNames = (leaves: CollectedTokenLeaf[]) =>
  new Set(
    selectSquircleDoubledRadiusLeaves(leaves).map(({ varName }) => varName),
  );

export const buildStylexTokens = (leaves: CollectedTokenLeaf[]): string => {
  const squircleVarNames = collectSquircleVarNames(leaves);
  return `${GENERATED_TYPESCRIPT_HEADER}
import * as stylex from '@stylexjs/stylex';

${[...groupLeavesForStylex(leaves)]
  .map(
    ([groupName, groupLeaves]) =>
      `export const ${groupName} = stylex.defineVars({\n${renderVars({ leaves: groupLeaves, scheme: 'light', squircleVarNames })}\n});`,
  )
  .join('\n\n')}
`;
};

export const buildStylexThemes = (leaves: CollectedTokenLeaf[]): string => {
  const groups = [...groupLeavesForStylex(leaves)];
  const squircleVarNames = collectSquircleVarNames(leaves);
  return `${GENERATED_TYPESCRIPT_HEADER}
import * as stylex from '@stylexjs/stylex';

import { ${groups.map(([groupName]) => groupName).join(', ')} } from './tokens.stylex';

${groups
  .map(
    ([groupName, groupLeaves]) =>
      `const ${groupName}Dark = stylex.createTheme(${groupName}, {\n${renderVars({ leaves: groupLeaves, scheme: 'dark', squircleVarNames })}\n});`,
  )
  .join('\n\n')}

export const darkTheme = [
${groups.map(([groupName]) => `  ${groupName}Dark,`).join('\n')}
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
