import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { codeFont } from 'twenty-ui/theme/tokens.stylex';

import { VALIDATION_RULE_HIGHLIGHT_COLORS } from '@/validation-rules/constants/ValidationRuleHighlightColors';
import { computeValidationRuleExpressionHighlights } from '@/validation-rules/utils/computeValidationRuleExpressionHighlights';

const styles = stylex.create({
  expression: {
    fontFamily: codeFont['--t-code-font-family'],
  },
  token: (color: string) => ({ color }),
});

type SettingsValidationRuleExpressionTextProps = {
  expression: string;
  xstyle?: stylex.StyleXStyles;
};

export const SettingsValidationRuleExpressionText = ({
  expression,
  xstyle,
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
        <span
          key={start}
          {...stylex.props(
            styles.token(VALIDATION_RULE_HIGHLIGHT_COLORS[kind]),
          )}
        >
          {expression.slice(start, end)}
        </span>,
      ],
      offset: end,
    }),
    { nodes: [], offset: 0 },
  );

  return (
    <span {...stylex.props(styles.expression, xstyle)}>
      {parts.nodes}
      {expression.slice(parts.offset)}
    </span>
  );
};
