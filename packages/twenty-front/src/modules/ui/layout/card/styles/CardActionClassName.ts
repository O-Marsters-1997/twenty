import * as stylex from '@stylexjs/stylex';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  action: {
    backgroundColor: 'transparent',
    borderStyle: 'none',
    cursor: 'pointer',
    inset: 0,
    padding: 0,
    position: 'absolute',
    outlineColor: {
      default: null,
      ':focus-visible': color['--t-color-blue'],
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '-2px',
    },
    outlineStyle: {
      default: null,
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: null,
      ':focus-visible': '2px',
    },
  },
});

export const CARD_ACTION_CLASS_NAME = stylex.props(styles.action).className;
