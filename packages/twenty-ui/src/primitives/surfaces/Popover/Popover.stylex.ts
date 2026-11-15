import * as stylex from '@stylexjs/stylex';

import {
  animationDuration,
  backgroundTransparent,
  blur,
  borderColor,
  borderRadius,
  boxShadow,
  fontColor,
  fontSize,
  fontWeight,
  general,
  spacing,
} from '../../../theme/tokens.stylex';

export const popoverVars = stylex.defineVars({
  '--tw-popover-padding': spacing['--t-spacing-2'],
});

const ARROW_SIZE = '6px';
const transitioning = ':is([data-starting-style], [data-ending-style])';
const sideTop = ':is([data-side="top"])';
const sideBottom = ':is([data-side="bottom"])';
const sideLeft =
  ':is([data-side="left"], [data-side="inline-start"]:dir(ltr), [data-side="inline-end"]:dir(rtl))';
const sideRight =
  ':is([data-side="right"], [data-side="inline-end"]:dir(ltr), [data-side="inline-start"]:dir(rtl))';
const sideHorizontal =
  ':is([data-side="left"], [data-side="right"], [data-side="inline-start"], [data-side="inline-end"])';
const sideVertical = ':is([data-side="top"], [data-side="bottom"])';

export const popoverStyles = stylex.create({
  positioner: {
    zIndex: general['--t-last-layer-z-index'],
  },
  popup: {
    backdropFilter: blur['--t-blur-medium'],
    background: backgroundTransparent['--t-background-transparent-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: boxShadow['--t-box-shadow-strong'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    maxInlineSize: 'var(--available-width)',
    opacity: { default: null, [transitioning]: 0 },
    outline: 'none',
    overflow: 'visible',
    padding: popoverVars['--tw-popover-padding'],
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: {
      default: 'ease-out',
      ':is([data-ending-style])': 'ease-in',
    },
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    margin: 0,
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    margin: 0,
  },
  arrow: {
    background: 'inherit',
    backdropFilter: blur['--t-blur-medium'],
    bottom: { default: null, [sideTop]: `calc(-1 * ${ARROW_SIZE})` },
    clipPath: {
      default: null,
      [sideTop]: 'polygon(0 0, 100% 0, 50% 100%)',
      [sideBottom]: 'polygon(50% 0, 100% 100%, 0 100%)',
      [sideLeft]: 'polygon(0 0, 100% 50%, 0 100%)',
      [sideRight]: 'polygon(100% 0, 100% 100%, 0 50%)',
    },
    height: {
      default: null,
      [sideVertical]: ARROW_SIZE,
      [sideHorizontal]: `calc(2 * ${ARROW_SIZE})`,
    },
    left: { default: null, [sideRight]: `calc(-1 * ${ARROW_SIZE})` },
    position: 'absolute',
    right: { default: null, [sideLeft]: `calc(-1 * ${ARROW_SIZE})` },
    top: { default: null, [sideBottom]: `calc(-1 * ${ARROW_SIZE})` },
    width: {
      default: null,
      [sideVertical]: `calc(2 * ${ARROW_SIZE})`,
      [sideHorizontal]: ARROW_SIZE,
    },
  },
});
