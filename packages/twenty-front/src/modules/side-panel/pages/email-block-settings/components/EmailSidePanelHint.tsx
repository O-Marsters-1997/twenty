import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    padding: spacing['--t-spacing-4'],
  },
});

export const EmailSidePanelHint = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(styles.root)}>{children}</div>
);
