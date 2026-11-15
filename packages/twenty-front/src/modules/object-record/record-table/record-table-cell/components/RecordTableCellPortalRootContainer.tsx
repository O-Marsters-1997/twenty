import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

type RecordTableCellPortalRootContainerProps = {
  children?: ReactNode;
  zIndex?: number;
};

export const RecordTableCellPortalRootContainer = ({
  children,
  zIndex,
}: RecordTableCellPortalRootContainerProps) => (
  <div
    {...stylex.props(
      styles.root,
      zIndex !== undefined && styles.zIndex(zIndex),
    )}
  >
    {children}
  </div>
);

const styles = stylex.create({
  root: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 'auto',
  },
  zIndex: (zIndex: number) => ({ zIndex }),
});
