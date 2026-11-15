import * as stylex from '@stylexjs/stylex';

import {
  fontColor,
  fontSize,
  fontWeight,
  textLineHeight,
} from '../../../theme/tokens.stylex';

export const headingStyles = stylex.create({
  root: {
    fontFamily: 'inherit',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    marginBlock: 0,
    marginInline: 0,
    overflowWrap: 'anywhere',
  },
});

export const headingSizeStyles = stylex.create({
  xs: { fontSize: fontSize['--t-font-size-xs'] },
  sm: { fontSize: fontSize['--t-font-size-sm'] },
  md: { fontSize: fontSize['--t-font-size-md'] },
  lg: { fontSize: fontSize['--t-font-size-lg'] },
});

export const headingColorStyles = stylex.create({
  primary: { color: fontColor['--t-font-color-primary'] },
  secondary: { color: fontColor['--t-font-color-secondary'] },
  tertiary: { color: fontColor['--t-font-color-tertiary'] },
});
