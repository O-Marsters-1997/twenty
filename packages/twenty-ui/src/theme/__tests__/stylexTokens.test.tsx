import { render, screen } from '@testing-library/react';

import { StylexTokenSample } from '@ui/theme/__stories__/StylexTokenSample';
import * as tokens from '@ui/theme/tokens.stylex';
import { themeCssVariables } from '@ui/theme/themeCssVariables';

const collectVarNames = (node: unknown): string[] =>
  typeof node === 'string'
    ? [node.match(/^var\((--t-[^,)]+)/)?.[1] ?? node]
    : Object.values(node as Record<string, unknown>).flatMap(collectVarNames);

describe('stylex tokens', () => {
  it('defines a var for every themeCssVariables key', () => {
    const definedVarNames = new Set(
      Object.values(tokens).flatMap((group) => Object.keys(group)),
    );

    const missing = collectVarNames(themeCssVariables).filter(
      (varName) => !definedVarNames.has(varName),
    );

    expect(missing).toEqual([]);
  });

  it('renders a component styled only with the generated vars', () => {
    render(<StylexTokenSample />);

    expect(screen.getByText('StyleX tokens').className).not.toBe('');
  });
});
