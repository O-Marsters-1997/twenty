import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { Card } from 'twenty-ui/primitives/surfaces';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    '--card-background-color': background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    padding: spacing['--t-spacing-2'],
  },
});

export const StyledLogConsoleFieldsCard = ({
  children,
}: {
  children: ReactNode;
}) => <Card.Root {...stylex.props(styles.card)}>{children}</Card.Root>;
