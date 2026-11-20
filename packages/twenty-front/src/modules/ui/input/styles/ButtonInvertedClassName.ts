import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  inverted: {
    '--tw-button-active': {
      default: null,
      ':is([data-variant=ghost])':
        backgroundTransparent['--t-background-transparent-medium'],
      ':is([data-variant=outline])':
        backgroundTransparent['--t-background-transparent-medium'],
    },
    '--tw-button-background': {
      default: null,
      ':is([data-variant=ghost])': 'transparent',
      ':is([data-variant=outline])': 'transparent',
    },
    '--tw-button-border': {
      default: null,
      ':is([data-variant=outline])':
        backgroundTransparent['--t-background-transparent-primary'],
    },
    '--tw-button-color': {
      default: null,
      ':is([data-variant=ghost])': fontColor['--t-font-color-inverted'],
      ':is([data-variant=outline])': fontColor['--t-font-color-inverted'],
    },
    '--tw-button-hover': {
      default: null,
      ':is([data-variant=ghost])':
        backgroundTransparent['--t-background-transparent-light'],
      ':is([data-variant=outline])':
        backgroundTransparent['--t-background-transparent-light'],
    },
  },
});

export const BUTTON_INVERTED_CLASS_NAME = stylex.props(
  styles.inverted,
).className;
