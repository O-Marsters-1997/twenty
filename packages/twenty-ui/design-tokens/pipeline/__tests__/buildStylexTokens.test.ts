import { type CollectedTokenLeaf } from '../../types/CollectedTokenLeaf';
import { buildStylexThemes, buildStylexTokens } from '../buildStylexTokens';
import { pathToVarName } from '../pathToVarName';

const radiusLeaf = (
  name: string,
  value: string,
  darkValue = value,
): CollectedTokenLeaf => {
  const path = ['border', 'radius', name];
  return { path, varName: pathToVarName(path), light: value, dark: darkValue };
};

const roundRadiusLeaves = [
  radiusLeaf('smRound', '4px'),
  radiusLeaf('mdRound', '8px'),
  radiusLeaf('pill', '999px'),
  radiusLeaf('rounded', '100%'),
];

const radiusLeaves = [
  radiusLeaf('xs', '2px'),
  radiusLeaf('sm', '4px'),
  radiusLeaf('md', '8px'),
  ...roundRadiusLeaves,
  radiusLeaf('lg', '16px'),
  radiusLeaf('xl', '20px'),
  radiusLeaf('xxl', '40px'),
];

describe('buildStylexTokens', () => {
  it('doubles every radius that is not round under @supports', () => {
    const tokens = buildStylexTokens([
      ...radiusLeaves,
      radiusLeaf('xxxl', '48px'),
    ]);

    expect(tokens).toContain(
      "'--t-border-radius-md': { default: '8px', '@supports (corner-shape: squircle)': '16px' }",
    );
    expect(tokens).toContain("'@supports (corner-shape: squircle)': '80px'");
    expect(tokens).toContain("'@supports (corner-shape: squircle)': '96px'");
  });

  it('never doubles the round radius tokens', () => {
    const tokens = buildStylexTokens(radiusLeaves);

    expect(tokens).toContain("'--t-border-radius-pill': '999px'");
    expect(tokens).toContain("'--t-border-radius-rounded': '100%'");
    expect(tokens).toContain("'--t-border-radius-sm-round': '4px'");
    expect(tokens).toContain("'--t-border-radius-md-round': '8px'");
  });

  it('emits the dark values with the same squircle condition', () => {
    const themes = buildStylexThemes(radiusLeaves);

    expect(themes).toContain(
      "'--t-border-radius-md': { default: '8px', '@supports (corner-shape: squircle)': '16px' }",
    );
  });

  it('throws when a round radius token is missing from the source', () => {
    expect(() =>
      buildStylexTokens(radiusLeaves.filter((leaf) => leaf.path[2] !== 'pill')),
    ).toThrow('Missing round radius token "pill" for the squircle block.');
  });

  it('throws when no radius token is left to double', () => {
    expect(() => buildStylexTokens(roundRadiusLeaves)).toThrow(
      'Missing the border radius tokens for the squircle block.',
    );
  });

  it('throws when a squircle radius is not a scheme-invariant integer px value', () => {
    expect(() =>
      buildStylexTokens([
        radiusLeaf('xs', '2px', '3px'),
        ...radiusLeaves.slice(1),
      ]),
    ).toThrow('must be a scheme-invariant integer px value');
  });
});
