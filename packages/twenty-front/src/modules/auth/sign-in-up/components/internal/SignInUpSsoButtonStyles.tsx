import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  root: {
    position: 'relative',
    width: '100%',
  },
});

export const StyledSsoButtonContainer = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.root)}>{children}</div>;
