import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  root: {
    position: 'relative',
  },
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
});

export const WorkflowDiagramEdgeV2VisibilityContainer = ({
  shouldDisplay,
  children,
}: {
  shouldDisplay: boolean;
  children?: ReactNode;
}) => (
  <div
    {...stylex.props(
      styles.root,
      shouldDisplay ? styles.visible : styles.hidden,
    )}
  >
    {children}
  </div>
);
