import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'space-between',
    transitionDuration: '160ms',
    transitionProperty: 'padding',
    transitionTimingFunction: 'ease-in-out',
    height: '32px',
  },
  paddingDefault: {
    paddingInline: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
  },
  paddingCompact: {
    paddingInline: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  paddingSmall: {
    paddingInline: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
});

type RecordCardHeaderContainerProps = {
  isCompact: boolean;
  hasSmallPadding?: boolean;
  children: ReactNode;
};

export const RecordCardHeaderContainer = ({
  isCompact,
  hasSmallPadding = false,
  children,
}: RecordCardHeaderContainerProps) => (
  <div
    {...stylex.props(
      styles.container,
      hasSmallPadding
        ? styles.paddingSmall
        : isCompact
          ? styles.paddingCompact
          : styles.paddingDefault,
    )}
  >
    {children}
  </div>
);
