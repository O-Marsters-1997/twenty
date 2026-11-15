import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  spacing,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const SidePanelWorkflowSelectStepTitle = ({
  children,
}: {
  children?: ReactNode;
}) => <span {...stylex.props(styles.root)}>{children}</span>;
