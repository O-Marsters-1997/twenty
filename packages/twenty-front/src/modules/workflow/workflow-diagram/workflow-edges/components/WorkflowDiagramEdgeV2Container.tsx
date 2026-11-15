import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    padding: spacing['--t-spacing-1'],
    pointerEvents: 'all',
    position: 'absolute',
  },
  transform: (labelX: number, labelY: number) => ({
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
  }),
});

export const WorkflowDiagramEdgeV2Container = ({
  labelX,
  labelY,
  children,
  'data-click-outside-id': dataClickOutsideId,
}: {
  labelX: number;
  labelY: number;
  children?: ReactNode;
  'data-click-outside-id'?: string;
}) => (
  <div
    {...stylex.props(styles.root, styles.transform(labelX, labelY))}
    data-click-outside-id={dataClickOutsideId}
  >
    {children}
  </div>
);
