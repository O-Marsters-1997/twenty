import * as stylex from '@stylexjs/stylex';

import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

const invalid = ':is([aria-invalid="true"], [data-invalid])';

export const inputStyles = stylex.create({
  input: {
    appearance: 'none',
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    blockSize: 32,
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
      [invalid]: borderColor['--t-border-color-danger'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    cursor: { default: null, ':disabled': 'not-allowed' },
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    inlineSize: '100%',
    margin: 0,
    minInlineSize: 0,
    outline: 'none',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textOverflow: 'ellipsis',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  sizeSm: { blockSize: 24 },
  grouped: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    blockSize: 'auto',
    borderRadius: 0,
    borderWidth: 0,
    flex: 1,
    paddingInline: 0,
  },
});
