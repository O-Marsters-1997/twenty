import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  separator: {
    backgroundColor: borderColor['--t-border-color-light'],
    minHeight: '1px',
    width: '100%',
  },
});

export const OverlayMenuListSeparator = () => (
  <div role="separator" {...stylex.props(styles.separator)} />
);
