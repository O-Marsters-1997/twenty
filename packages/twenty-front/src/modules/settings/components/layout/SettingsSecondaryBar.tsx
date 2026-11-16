import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

// Bottom separator is an ::after (not border-bottom), and the bar keeps full
// height (default align-items) so the active tab's underline lands exactly on it.
const styles = stylex.create({
  secondaryBar: {
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    minHeight: spacing['--t-spacing-10'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
    position: { default: 'relative', '::after': 'absolute' },
    width: '100%',
    backgroundColor: {
      default: null,
      '::after': borderColor['--t-border-color-light'],
    },
    bottom: { default: null, '::after': '0' },
    content: { default: null, '::after': "''" },
    height: { default: null, '::after': '1px' },
    left: { default: null, '::after': '0' },
    right: { default: null, '::after': '0' },
  },
});

export const SettingsSecondaryBar = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.secondaryBar)}>{children}</div>
);
