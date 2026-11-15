import ts from 'typescript';

import { themeCssVariables } from '../../../../twenty-ui/src/theme/themeCssVariables';
import { convertSource } from '../convertSource';
import { resolveTokenReference } from '../tokenPath';

const HEADER = `import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';
`;

const convert = (body: string, header = HEADER) =>
  convertSource('Example.tsx', `${header}\n${body}`);

describe('linaria-to-stylex convertSource', () => {
  it('converts a static styled block and carries JSX props across', () => {
    const { output, findings } = convert(`const StyledBox = styled.div\`
  display: flex;
  gap: \${themeCssVariables.spacing[4]};
\`;

export const Example = () => (
  <StyledBox id="a" onClick={go}>
    hi
  </StyledBox>
);
`);

    expect(findings).toEqual([]);
    expect(output).toContain("import * as stylex from '@stylexjs/stylex';");
    expect(output).toContain(
      "import { spacing } from 'twenty-ui/theme/tokens.stylex';",
    );
    expect(output).toContain("gap: spacing['--t-spacing-4'],");
    expect(output).toContain("display: 'flex',");
    expect(output).toContain(
      '<div id="a" onClick={go} {...stylex.props(styles.box)}>',
    );
    expect(output).toContain('</div>');
    expect(output).not.toContain('@linaria/react');
    expect(output).not.toContain("from 'twenty-ui/theme';");
  });

  it('converts a css block used as className', () => {
    const { output, findings } = convertSource(
      'Example.tsx',
      `import { css } from '@linaria/core';

const active = css\`
  color: red;
\`;

export const Example = () => <div className={active} />;
`,
    );

    expect(findings).toEqual([]);
    expect(output).toContain("color: 'red',");
    expect(output).toContain('<div {...stylex.props(styles.active)} />');
  });

  it('turns pseudo selectors into conditional values', () => {
    const { output } = convert(`const StyledLink = styled.a\`
  color: blue;
  &:hover { color: red; }
  &::before { content: ''; }
\`;
const Example = () => <StyledLink />;
`);

    expect(output).toContain(
      "color: { default: 'blue', ':hover': 'red' },",
    );
    expect(output).toContain(`content: { default: null, '::before': "''" },`);
  });

  it('maps the mobile media query to media.mobile', () => {
    const { output } = convert(`const StyledBox = styled.div\`
  padding: 8px;
  @media (max-width: \${MOBILE_VIEWPORT}px) { padding: 4px; }
\`;
const Example = () => <StyledBox />;
`, `import { styled } from '@linaria/react';
import { MOBILE_VIEWPORT } from 'twenty-ui/theme';
`);

    expect(output).toContain(
      "import { media } from 'twenty-ui/theme/constants.stylex';",
    );
    expect(output).toContain(
      "paddingTop: { default: '8px', [media.mobile]: '4px' },",
    );
    expect(output).not.toContain('MOBILE_VIEWPORT');
  });

  it('expands shorthands to longhands', () => {
    const { output } = convert(`const StyledBox = styled.div\`
  padding: 1px 2px;
  margin: 0;
  border-radius: 4px 8px;
  border: 1px solid \${themeCssVariables.border.color.medium};
\`;
const Example = () => <StyledBox />;
`);

    expect(output).toContain("paddingTop: '1px',");
    expect(output).toContain("paddingRight: '2px',");
    expect(output).toContain("paddingBottom: '1px',");
    expect(output).toContain("paddingLeft: '2px',");
    expect(output).toContain("marginLeft: '0',");
    expect(output).toContain("borderTopLeftRadius: '4px',");
    expect(output).toContain("borderTopRightRadius: '8px',");
    expect(output).toContain("borderWidth: '1px',");
    expect(output).toContain("borderStyle: 'solid',");
    expect(output).toContain("borderColor: border['--t-border-color-medium'],");
  });

  it.each([
    [
      'prop interpolation',
      'color: ${({ active }) => (active ? "red" : "blue")};',
      'prop interpolation',
    ],
    ['nested selector', '& > span { color: red; }', 'nested selector & > span'],
    ['!important', 'color: red !important;', '!important'],
  ])('leaves a %s block unchanged and reports it', (_label, rule, reason) => {
    const body = `const StyledBox = styled.div\`
  ${rule}
\`;
const Example = () => <StyledBox />;
`;
    const { output, findings, convertedCount } = convert(body);

    expect(convertedCount).toBe(0);
    expect(output).toBe(`${HEADER}\n${body}`);
    expect(findings).toEqual([
      { file: 'Example.tsx', line: 4, name: 'StyledBox', reason },
    ]);
  });

  it('reports ${StyledX} references on both blocks', () => {
    const { findings, convertedCount } = convert(`const StyledInner = styled.div\`
  color: red;
\`;
const StyledOuter = styled.div\`
  \${StyledInner}:hover & { color: blue; }
\`;
const Example = () => <StyledOuter><StyledInner /></StyledOuter>;
`);

    expect(convertedCount).toBe(0);
    expect(findings.map(({ name, reason }) => [name, reason])).toEqual([
      ['StyledInner', '${StyledInner} reference'],
      ['StyledOuter', '${StyledInner} reference'],
    ]);
  });

  it('throws on CSS it cannot parse', () => {
    expect(() =>
      convert(`const StyledBox = styled.div\`
  color: red;
  {{{
\`;
const Example = () => <StyledBox />;
`),
    ).toThrow('Example.tsx:4');
  });

  it('derives variable names that match themeCssVariables', () => {
    const walk = (node: unknown, path: string[]) => {
      if (typeof node === 'string') {
        const expression = ts.createSourceFile(
          'x.ts',
          `themeCssVariables${path.map((segment) => `['${segment}']`).join('')}`,
          ts.ScriptTarget.Latest,
          true,
        ).statements[0] as ts.ExpressionStatement;
        const token = resolveTokenReference(expression.expression);
        expect(token?.code).toBe(
          `${path[0]}['${node.slice(4, -1)}']`,
        );
        return;
      }
      for (const [key, child] of Object.entries(node as object)) {
        walk(child, [...path, key]);
      }
    };

    Object.entries(themeCssVariables)
      .filter(([, child]) => typeof child === 'object')
      .forEach(([key, child]) => walk(child, [key]));
  });
});
