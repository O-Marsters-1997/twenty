import { AppErrorDisplay } from '@/error-handler/components/internal/AppErrorDisplay';
import { type AppErrorDisplayProps } from '@/error-handler/types/AppErrorDisplayProps';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

type AppFullScreenErrorFallbackProps = AppErrorDisplayProps;

const styles = stylex.create({
  container: {
    background: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    width: 'calc(100vw / var(--t-zoom, 1))',
  },
});

export const AppFullScreenErrorFallback = ({
  error,
  resetErrorBoundary,
  title = t`Sorry, something went wrong`,
}: AppFullScreenErrorFallbackProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <AppErrorDisplay
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        title={title}
      />
    </div>
  );
};
