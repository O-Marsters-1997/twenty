import { AppErrorBoundary } from '@/error-handler/components/AppErrorBoundary';
import { AppErrorDisplay } from '@/error-handler/components/internal/AppErrorDisplay';
import { type AppErrorDisplayProps } from '@/error-handler/types/AppErrorDisplayProps';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    background: background['--t-background-primary'],
    flexBasis: 'auto',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
  },
  layout: (
    rowGap: string,
    display: string,
    overflow: string,
    paddingBlock: string,
    paddingInline: string,
    gridTemplateRows: string,
  ) => ({
    display,
    gridTemplateRows,
    overflow,
    paddingBlock,
    paddingInline,
    rowGap,
  }),
});

export const WorkflowStepBody = ({
  children,
  rowGap,
  display,
  overflow,
  paddingBlock,
  paddingInline,
  gridTemplateRows,
}: {
  children: React.ReactNode;
  rowGap?: string;
  display?: string;
  overflow?: string;
  paddingBlock?: string;
  paddingInline?: string;
  gridTemplateRows?: string;
}) => {
  return (
    <div
      {...stylex.props(
        styles.root,
        styles.layout(
          rowGap ?? spacing['--t-spacing-4'],
          display ?? 'flex',
          overflow ?? 'hidden scroll',
          paddingBlock ?? spacing['--t-spacing-4'],
          paddingInline ?? spacing['--t-spacing-3'],
          gridTemplateRows ?? 'none',
        ),
      )}
    >
      <AppErrorBoundary
        resetOnLocationChange={true}
        FallbackComponent={({
          error,
          resetErrorBoundary,
          title,
        }: AppErrorDisplayProps) => (
          <AppErrorDisplay
            error={error}
            resetErrorBoundary={resetErrorBoundary}
            title={title}
          />
        )}
      >
        {children}
      </AppErrorBoundary>
    </div>
  );
};
