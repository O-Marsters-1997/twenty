import * as stylex from '@stylexjs/stylex';
import { type ComponentProps, forwardRef } from 'react';
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
    paddingBlock: 0,
    paddingInline: 0,
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontSize: fontSize['--t-font-size-md'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
});

export const StyledComposerTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps<'input'>
>((props, ref) => (
  <input {...props} ref={ref} {...stylex.props(styles.input)} />
));
