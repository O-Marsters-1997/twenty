import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  input: {
    backgroundColor: 'transparent',
    borderStyle: 'none',
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    outlineStyle: 'none',
    padding: 0,
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontSize: fontSize['--t-font-size-md'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
});

export const StyledComposerTextInput = (props: ComponentProps<'input'>) => (
  <input {...props} {...stylex.props(styles.input)} />
);
