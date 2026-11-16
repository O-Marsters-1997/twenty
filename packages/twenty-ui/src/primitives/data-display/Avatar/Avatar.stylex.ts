import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontWeight,
} from '../../../theme/tokens.stylex';

export const avatarVars = stylex.defineVars({
  '--tw-avatar-color': fontColor['--t-font-color-tertiary'],
  '--tw-avatar-background': 'transparent',
  '--tw-avatar-border-color': 'transparent',
  '--tw-avatar-border-width': '0px',
});

const interactive =
  ':is(button, a[href], [role="button"], [role="link"]):not(:disabled):not([aria-disabled="true"])';

const ringShadow = `0 0 0 1px ${borderColor['--t-border-color-light']}, 0 0 0 2px ${background['--t-background-primary']}`;
const hoverShadow = `0 0 0 4px ${backgroundTransparent['--t-background-transparent-light']}`;

const pulse = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.4 },
});

export const avatarSizeStyles = stylex.create({
  xl: { blockSize: '40px', fontSize: '16px', inlineSize: '40px' },
  lg: { blockSize: '24px', fontSize: '13px', inlineSize: '24px' },
  md: { blockSize: '16px', fontSize: '12px', inlineSize: '16px' },
  sm: { blockSize: '14px', fontSize: '10px', inlineSize: '14px' },
  xs: { blockSize: '12px', fontSize: '8px', inlineSize: '12px' },
});

export const avatarStyles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: avatarVars['--tw-avatar-background'],
    borderColor: avatarVars['--tw-avatar-border-color'],
    borderRadius: borderRadius['--t-border-radius-xs'],
    borderStyle: 'solid',
    borderWidth: avatarVars['--tw-avatar-border-width'],
    boxShadow: {
      default: null,
      [`${interactive}:hover`]: {
        default: null,
        [media.hoverCapable]: hoverShadow,
      },
    },
    boxSizing: 'border-box',
    color: avatarVars['--tw-avatar-color'],
    cursor: { default: null, [interactive]: 'pointer' },
    display: 'flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: 0,
    position: 'relative',
    textDecoration: 'none',
    userSelect: 'none',
  },
  shapeRoundedSquare: { borderRadius: borderRadius['--t-border-radius-sm'] },
  shapeCircle: { borderRadius: '50%' },
  ring: {
    boxShadow: {
      default: ringShadow,
      [`${interactive}:hover`]: {
        default: null,
        [media.hoverCapable]: hoverShadow,
      },
    },
  },
  pulsing: {
    animationDirection: 'alternate',
    animationDuration: '0.8s',
    animationIterationCount: 'infinite',
    animationName: { default: pulse, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'ease-in-out',
    opacity: { default: null, [media.reducedMotion]: 1 },
  },
  image: {
    blockSize: '100%',
    inlineSize: '100%',
    objectFit: 'cover',
    inset: {
      default: null,
      ':is([data-loading], [data-error])': 0,
    },
    opacity: {
      default: null,
      ':is([data-loading], [data-error])': 0,
    },
    pointerEvents: {
      default: null,
      ':is([data-loading], [data-error])': 'none',
    },
    position: {
      default: null,
      ':is([data-loading], [data-error])': 'absolute',
    },
  },
  fallback: {
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});
