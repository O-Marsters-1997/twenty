import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: 'var(--widget-height, 100%)',
    minHeight: 0,
    width: '100%',
  },
  scroll: {
    flex: 1,
    overflow: 'var(--widget-scroll-overflow, auto)',
  },
});

export const StyledWidgetContentContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;

export const StyledWidgetScrollContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.container, styles.scroll)}>{children}</div>;
