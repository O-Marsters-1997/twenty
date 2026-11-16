import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

const interactive = ':is(button, a[href], [role="button"], [role="link"])';
const disabled = ':is(:disabled, [aria-disabled="true"], [data-disabled])';
const enabled = ':not(:is(:disabled, [aria-disabled="true"], [data-disabled]))';
const hover = interactive + enabled + ':hover';
const hoverBackground = {
  default: null,
  [media.hoverCapable]:
    backgroundTransparent['--t-background-transparent-light'],
};

export const cardStyles = stylex.create({
  owner: {
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: {
      default: null,
      [interactive + enabled]: 'pointer',
      [interactive + disabled]: 'not-allowed',
    },
    display: 'block',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
    margin: 0,
    opacity: { default: null, [interactive + disabled]: 0.5 },
    outlineOffset: { default: null, [interactive + ':focus-visible']: '-2px' },
    paddingBlock: 0,
    paddingInline: 0,
    textAlign: 'inherit',
    textDecoration: 'none',
  },
  root: {
    '--card-section-background-color': {
      default: 'initial',
      [hover]: { default: null, [media.hoverCapable]: 'transparent' },
    },
    backgroundColor: {
      default: 'var(--card-background-color, transparent)',
      [hover]: hoverBackground,
    },
    borderBottomWidth: 1,
    borderColor: borderColor['--t-border-color-medium'],
    borderLeftWidth: 1,
    borderRadius: borderRadius['--t-border-radius-md'],
    borderRightWidth: 1,
    borderStyle: 'solid',
    borderTopWidth: 1,
    color: fontColor['--t-font-color-secondary'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    overflow: 'hidden',
    width: 'auto',
  },
  fullWidth: {
    width: '100%',
  },
  section: {
    borderBottomWidth: 0,
    borderColor: borderColor['--t-border-color-medium'],
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderStyle: 'solid',
    borderTopWidth: 0,
    width: '100%',
  },
  content: {
    backgroundColor: {
      default: `var(--card-section-background-color, ${background['--t-background-secondary']})`,
      [hover]: hoverBackground,
    },
    fontSize: 'inherit',
    fontWeight: 'inherit',
    paddingBlock: spacing['--t-spacing-4'],
    paddingInline: spacing['--t-spacing-4'],
  },
  contentDivider: {
    borderBottomWidth: 1,
  },
  footer: {
    backgroundColor: {
      default: `var(--card-section-background-color, ${background['--t-background-primary']})`,
      [hover]: hoverBackground,
    },
    borderTopWidth: 1,
    fontSize: fontSize['--t-font-size-sm'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-4'],
  },
  footerNoDivider: {
    borderTopWidth: 0,
  },
  header: {
    backgroundColor: {
      default: `var(--card-section-background-color, ${background['--t-background-primary']})`,
      [hover]: hoverBackground,
    },
    borderBottomWidth: 1,
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-4'],
  },
});
