import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  color,
  fontColor,
  fontWeight,
  iconSize,
  spacing,
} from '../../../theme/tokens.stylex';

const disabled = ':is([data-disabled])';

export const currencyPickerStyles = stylex.create({
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      [`:hover:not(${disabled})`]: {
        default: null,
        [media.hoverCapable]:
          backgroundTransparent['--t-background-transparent-light'],
      },
    },
    blockSize: 32,
    borderInlineEndColor: borderColor['--t-border-color-medium'],
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: 1,
    borderRadius: 0,
    borderStyle: 'none',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    cursor: { default: 'pointer', [disabled]: 'not-allowed' },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    opacity: { default: null, [disabled]: 0.5 },
    outlineColor: { default: null, ':focus-visible': color['--t-color-blue'] },
    outlineOffset: { default: null, ':focus-visible': -2 },
    outlineStyle: { default: null, ':focus-visible': 'solid' },
    outlineWidth: { default: null, ':focus-visible': 2 },
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  chevron: {
    blockSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    inlineSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  options: { display: 'flex', flexDirection: 'column', minInlineSize: 0 },
  emptyStatus: {
    margin: { default: spacing['--t-spacing-1'], ':empty': null },
    padding: { default: null, ':empty': 0 },
  },
});
