import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from '../../../theme/tokens.stylex';

const unavailable = ':is(:disabled, [aria-disabled="true"])';

export const phoneCountryPickerStyles = stylex.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      [`:hover:not(${unavailable})`]: {
        default: null,
        [media.hoverCapable]:
          backgroundTransparent['--t-background-transparent-light'],
      },
    },
    blockSize: spacing['--t-spacing-8'],
    borderEndStartRadius: borderRadius['--t-border-radius-xs'],
    borderInlineEndColor: borderColor['--t-border-color-medium'],
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: 1,
    borderStartStartRadius: borderRadius['--t-border-radius-xs'],
    borderStyle: 'none',
    color: fontColor['--t-font-color-tertiary'],
    cursor: { default: 'pointer', [unavailable]: 'not-allowed' },
    display: 'inline-flex',
    flexShrink: 0,
    gap: spacing['--t-spacing-0_5'],
    paddingBlock: 0,
    paddingInlineEnd: spacing['--t-spacing-1'],
    paddingInlineStart: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  flag: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    justifyContent: 'center',
  },
  optionFlag: { paddingInlineEnd: spacing['--t-spacing-1'] },
  chevron: { blockSize: 14, inlineSize: 14 },
  selectedCountryLabel: {
    blockSize: 1,
    clipPath: 'inset(50%)',
    inlineSize: 1,
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
  },
});
