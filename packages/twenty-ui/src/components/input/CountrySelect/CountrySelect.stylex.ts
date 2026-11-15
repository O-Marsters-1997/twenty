import * as stylex from '@stylexjs/stylex';

import {
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
} from '../../../theme/tokens.stylex';

export const countrySelectStyles = stylex.create({
  root: { inlineSize: '100%', minInlineSize: 0 },
  label: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBlockEnd: spacing['--t-spacing-1'],
  },
  flag: {
    alignItems: 'center',
    blockSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    display: 'inline-flex',
    flex: 'none',
    inlineSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    justifyContent: 'center',
  },
});
