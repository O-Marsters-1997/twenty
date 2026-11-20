import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type StyledLogConsoleFieldsCardProps = {
  children: ReactNode;
};

export const StyledLogConsoleFieldsCard = ({
  children,
}: StyledLogConsoleFieldsCardProps) => (
  <Card.Root
    backgroundColor={themeCssVariables.background.secondary}
    xstyle={styles.card}
  >
    {children}
  </Card.Root>
);

const styles = stylex.create({
  card: {
    padding: spacing['--t-spacing-2'],
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
  },
});
