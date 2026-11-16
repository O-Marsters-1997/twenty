import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  group: {
    display: 'flex',
    flexDirection: 'column',
  },
});

export const NavigationDrawerItemGroup = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.group)}>{children}</div>;
