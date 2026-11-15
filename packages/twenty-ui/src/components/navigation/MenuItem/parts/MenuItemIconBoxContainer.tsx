import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from '../../../../theme/tokens.stylex';

export const StyledIconContainer = ({
  children,
  className,
  hasBackground = true,
}: {
  children?: ReactNode;
  className?: string;
  hasBackground?: boolean;
}) => (
  <div
    {...mergeStylexProps(
      stylex.props(styles.root, hasBackground && styles.withBackground),
      className,
    )}
  >
    {children}
  </div>
);

export { StyledIconContainer as MenuItemIconBoxContainer };

const styles = stylex.create({
  root: {
    alignItems: 'flex-start',
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexDirection: 'column',
    padding: spacing['--t-spacing-1'],
  },
  withBackground: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
});
