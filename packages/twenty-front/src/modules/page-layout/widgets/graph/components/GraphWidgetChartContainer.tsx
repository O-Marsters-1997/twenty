import * as stylex from '@stylexjs/stylex';
import { type ReactNode, type Ref } from 'react';
import '~/third-party-styles/graph-widget-charts.css';

type GraphWidgetChartContainerProps = {
  isClickable?: boolean;
  cursorTarget?: 'canvas' | 'svg-path';
  onMouseLeave?: () => void;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
};

export const GraphWidgetChartContainer = ({
  isClickable = false,
  cursorTarget,
  onMouseLeave,
  ref,
  children,
}: GraphWidgetChartContainerProps) => (
  <div
    ref={ref}
    data-clickable-target={isClickable ? cursorTarget : undefined}
    onMouseLeave={onMouseLeave}
    {...stylex.props(styles.container)}
  >
    {children}
  </div>
);

const styles = stylex.create({
  container: {
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    position: 'relative',
    width: '100%',
  },
});
