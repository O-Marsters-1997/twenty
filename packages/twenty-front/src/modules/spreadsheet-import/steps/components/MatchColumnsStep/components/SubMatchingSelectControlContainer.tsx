import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

type SubMatchingSelectControlContainerProps = {
  cursor: 'pointer' | 'default';
  children: ReactNode;
};

export const SubMatchingSelectControlContainer = ({
  cursor,
  children,
}: SubMatchingSelectControlContainerProps) => (
  <div {...stylex.props(styles.root, styles[cursor])}>{children}</div>
);

const styles = stylex.create({
  root: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    justifyContent: 'space-between',
    height: spacing['--t-spacing-8'],
    width: '100%',
  },
  pointer: {
    cursor: 'pointer',
  },
  default: {
    cursor: 'default',
  },
});
