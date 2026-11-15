import * as stylex from '@stylexjs/stylex';
import { type JSX } from 'react';

const styles = stylex.create({
  layout: {
    display: 'flex',
    flexDirection: 'row',
    height: 'calc(100vh - 32px)',
    width: 'calc(100vw - 32px)',
  },
});

type FullHeightStorybookLayoutProps = {
  children: JSX.Element;
};

export const FullHeightStorybookLayout = ({
  children,
}: FullHeightStorybookLayoutProps) => (
  <div {...stylex.props(styles.layout)}>{children}</div>
);
