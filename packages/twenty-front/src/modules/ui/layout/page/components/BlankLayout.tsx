import { Outlet } from 'react-router-dom';

import { AppErrorBoundary } from '@/error-handler/components/AppErrorBoundary';
import { AppFullScreenErrorFallback } from '@/error-handler/components/AppFullScreenErrorFallback';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  layout: {
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    position: 'relative',
    scrollbarWidth: '4px',
    width: '100%',
  },
});

export const BlankLayout = () => {
  return (
    <div {...stylex.props(styles.layout)}>
      <AppErrorBoundary FallbackComponent={AppFullScreenErrorFallback}>
        <Outlet />
      </AppErrorBoundary>
    </div>
  );
};
