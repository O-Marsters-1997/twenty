import * as stylex from '@stylexjs/stylex';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dot: {
    borderRadius: '50%',
    backgroundColor: color['--t-color-blue'],
    position: 'absolute',
    height: '6px',
    right: '-2px',
    top: '-2px',
    width: '6px',
  },
});

// Marks an icon as unread where no label can show it, so its parent must be
// positioned
export const StyledNavigationDrawerUnreadDot = () => (
  <span {...stylex.props(styles.dot)} />
);
