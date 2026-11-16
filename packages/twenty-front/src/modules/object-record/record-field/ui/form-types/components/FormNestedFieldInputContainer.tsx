import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  background,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export const FormNestedFieldInputContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;

const styles = stylex.create({
  container: {
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    padding: spacing['--t-spacing-2'],
  },
});
