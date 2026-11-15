import * as stylex from '@stylexjs/stylex';
import { Card } from 'twenty-ui/primitives/surfaces';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    backgroundColor: background['--t-background-secondary'],
    height: '40px',
  },
});

export const SettingsListSkeletonCard = () => (
  <Card.Root {...stylex.props(styles.card)} />
);
