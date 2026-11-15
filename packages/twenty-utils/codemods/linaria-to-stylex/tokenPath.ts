import ts from 'typescript';

export const TOKENS_MODULE = 'twenty-ui/theme/tokens.stylex';
export const CONSTANTS_MODULE = 'twenty-ui/theme/constants.stylex';

const toKebabCase = (segment: string) =>
  segment
    .replace(/(?<!^)[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .toLowerCase()
    .replace('.', '_');

export type TokenReference = {
  group: string;
  code: string;
  segments: string[];
};

export const resolveTokenReference = (
  expression: ts.Expression,
): TokenReference | undefined => {
  const segments: string[] = [];
  let current = expression;

  while (true) {
    if (ts.isPropertyAccessExpression(current)) {
      segments.unshift(current.name.text);
      current = current.expression;
    } else if (
      ts.isElementAccessExpression(current) &&
      (ts.isNumericLiteral(current.argumentExpression) ||
        ts.isStringLiteral(current.argumentExpression))
    ) {
      segments.unshift(current.argumentExpression.text);
      current = current.expression;
    } else {
      break;
    }
  }

  if (
    !ts.isIdentifier(current) ||
    current.text !== 'themeCssVariables' ||
    segments.length < 2
  ) {
    return undefined;
  }

  const [group] = segments;
  const variableName = `--t-${segments.map(toKebabCase).join('-')}`;

  return { group, code: `${group}['${variableName}']`, segments };
};
