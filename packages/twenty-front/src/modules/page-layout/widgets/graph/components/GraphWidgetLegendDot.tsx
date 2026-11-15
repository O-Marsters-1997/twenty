import { borderRadius } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type GraphWidgetLegendDotProps = {
  color: string;
};

export const GraphWidgetLegendDot = ({ color }: GraphWidgetLegendDotProps) => {
  return <div {...stylex.props(styles.dot, styles.color(color))} />;
};

const styles = stylex.create({
  dot: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    flexShrink: 0,
    height: 8,
    width: 8,
  },
  color: (color: string) => ({ backgroundColor: color }),
});
