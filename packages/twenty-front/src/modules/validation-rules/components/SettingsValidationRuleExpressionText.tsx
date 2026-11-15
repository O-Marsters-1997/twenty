import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { codeFont, color, fontColor } from 'twenty-ui/theme/tokens.stylex';

import { computeValidationRuleExpressionHighlights } from '@/validation-rules/utils/computeValidationRuleExpressionHighlights';

type SettingsValidationRuleExpressionTextProps = {
  expression: string;
};

export const SettingsValidationRuleExpressionText = ({
  expression,
}: SettingsValidationRuleExpressionTextProps) => {
  const highlights = computeValidationRuleExpressionHighlights(expression);

  const parts = highlights.reduce<{
    nodes: ReactNode[];
    offset: number;
  }>(
    ({ nodes, offset }, { kind, start, end }) => ({
      nodes: [
        ...nodes,
        expression.slice(offset, start),
        <span key={start} {...stylex.props(styles[kind])}>
          {expression.slice(start, end)}
        </span>,
      ],
      offset: end,
    }),
    { nodes: [], offset: 0 },
  );

  return (
    <span {...stylex.props(styles.expression)}>
      {parts.nodes}
      {expression.slice(parts.offset)}
    </span>
  );
};

const styles = stylex.create({
  expression: {
    fontFamily: codeFont['--t-code-font-family'],
  },
  string: { color: color['--t-color-green11'] },
  number: { color: color['--t-color-orange11'] },
  function: { color: color['--t-color-blue11'] },
  keyword: { color: color['--t-color-pink11'] },
  operator: { color: fontColor['--t-font-color-tertiary'] },
});
