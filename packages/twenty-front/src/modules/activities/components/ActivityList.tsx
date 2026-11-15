import * as stylex from '@stylexjs/stylex';
import { Card } from 'twenty-ui/primitives/surfaces';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  list: {
    width: '100%',
  },
  listScrollable: {
    flex: 1,
    height: '100%',
    minHeight: 0,
  },
  card: {
    width: 'calc(100% - 2px)',
  },
  cardScrollable: {
    boxSizing: 'border-box',
    height: '100%',
    overflowY: 'auto',
  },
});

type ActivityListProps = React.PropsWithChildren<{
  isScrollable?: boolean;
}>;

export const ActivityList = ({
  children,
  isScrollable = false,
}: ActivityListProps) => {
  return (
    <div {...stylex.props(styles.list, isScrollable && styles.listScrollable)}>
      <Card.Root xstyle={[styles.card, isScrollable && styles.cardScrollable]}>
        {children}
      </Card.Root>
    </div>
  );
};
