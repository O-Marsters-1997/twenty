import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsEmptyPlaceholderProps = {
  children: ReactNode;
  textAlign?: 'left' | 'center' | 'right';
};

const styles = stylex.create({
  root: {
    color: fontColor['--t-font-color-tertiary'],
    paddingBottom: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-8'],
    paddingRight: spacing['--t-spacing-8'],
    paddingTop: spacing['--t-spacing-8'],
  },
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

export const SettingsEmptyPlaceholder = ({
  children,
  textAlign = 'center',
}: SettingsEmptyPlaceholderProps) => {
  return (
    <div {...stylex.props(styles.root, styles[textAlign])}>{children}</div>
  );
};
