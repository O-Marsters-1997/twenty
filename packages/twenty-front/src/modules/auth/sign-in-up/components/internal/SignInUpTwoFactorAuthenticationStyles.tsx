import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  mainContent: {
    textAlign: 'center',
    marginBottom: spacing['--t-spacing-8'],
    marginTop: spacing['--t-spacing-4'],
  },
  instructions: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    textAlign: 'center',
    marginBottom: spacing['--t-spacing-4'],
    maxWidth: '280px',
  },
});

export const StyledTwoFactorMainContent = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.mainContent)}>{children}</div>;

export const StyledTwoFactorInstructions = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.instructions)}>{children}</div>;
