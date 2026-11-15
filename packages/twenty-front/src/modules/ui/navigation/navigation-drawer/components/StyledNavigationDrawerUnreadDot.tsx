import * as stylex from '@stylexjs/stylex';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dot: {
    backgroundColor: color['--t-color-blue'],
    borderRadius: '50%',
    height: '6px',
    position: 'absolute',
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
