import { Outlet } from 'react-router-dom';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  background: {
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    width: '100%',
  },
});

export const AuthFlowLayout = () => (
  <div {...stylex.props(styles.background)}>
    <Outlet />
  </div>
);
