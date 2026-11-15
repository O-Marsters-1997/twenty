import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  background,
  borderRadius,
  boxShadow,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    backdropFilter: 'blur(20px)',
    backgroundColor: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-light'],
    display: 'inline-flex',
    gap: spacing['--t-spacing-0_5'],
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-0_5'],
  },
});

type StyledBubbleMenuContainerProps = {
  children: ReactNode;
};

export const StyledBubbleMenuContainer = ({
  children,
}: StyledBubbleMenuContainerProps) => (
  <div {...stylex.props(styles.container)}>{children}</div>
);
