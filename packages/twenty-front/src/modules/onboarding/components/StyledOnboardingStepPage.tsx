import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  page: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexBasis: '0',
    flexDirection: 'column',
    flexGrow: '1',
    flexShrink: '1',
    gap: {
      default: spacing['--t-spacing-14'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
    minHeight: '0',
    overflowY: 'auto',
    paddingBottom: {
      default: spacing['--t-spacing-16'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
    paddingLeft: {
      default: spacing['--t-spacing-8'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    paddingRight: {
      default: spacing['--t-spacing-8'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    paddingTop: {
      default: spacing['--t-spacing-16'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
    width: '100%',
  },
});

type StyledOnboardingStepPageProps = {
  children: ReactNode;
  'data-testid'?: string;
  xstyle?: stylex.StyleXStyles;
};

export const StyledOnboardingStepPage = ({
  children,
  'data-testid': dataTestId,
  xstyle,
}: StyledOnboardingStepPageProps) => (
  <div data-testid={dataTestId} {...stylex.props(styles.page, xstyle)}>
    {children}
  </div>
);
