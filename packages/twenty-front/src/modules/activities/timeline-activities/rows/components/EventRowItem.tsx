import { type ReactNode } from 'react';

import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type EventRowItemProps = {
  children: ReactNode;
  variant?: 'column' | 'action';
};

const styles = stylex.create({
  column: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
  },
  action: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexDirection: 'row',
  },
});

export const EventRowItem = ({
  children,
  variant = 'column',
}: EventRowItemProps) => {
  if (variant === 'action') {
    return <div {...stylex.props(styles.action)}>{children}</div>;
  }

  return <div {...stylex.props(styles.column)}>{children}</div>;
};
