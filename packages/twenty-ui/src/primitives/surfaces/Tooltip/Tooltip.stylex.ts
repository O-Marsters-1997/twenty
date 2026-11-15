import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  animationDuration,
  blur,
  borderRadius,
  boxShadow,
  fontSize,
  fontWeight,
  general,
  spacing,
  tooltip,
} from '../../../theme/tokens.stylex';

const ARROW_SIZE = '6px';
const transitioning = ':is([data-starting-style], [data-ending-style])';
const sideTop = ':is([data-side="top"])';
const sideBottom = ':is([data-side="bottom"])';
const sideLeft = ':is([data-side="left"])';
const sideRight = ':is([data-side="right"])';
const sideVertical = ':is([data-side="top"], [data-side="bottom"])';
const sideHorizontal = ':is([data-side="left"], [data-side="right"])';

export const tooltipStyles = stylex.create({
  positioner: {
    zIndex: general['--t-last-layer-z-index'],
  },
  popup: {
    backdropFilter: blur['--t-blur-strong'],
    backgroundColor: tooltip['--t-tooltip-background'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-light'],
    boxSizing: 'border-box',
    color: tooltip['--t-tooltip-color'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    inlineSize: 'max-content',
    maxInlineSize: 'min(100%, var(--available-width))',
    opacity: { default: null, [transitioning]: 0 },
    overflow: 'visible',
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-1_5'],
    transitionDuration: {
      default: '0.15s',
      ':is([data-ending-style])': '0s',
    },
    transitionProperty: { default: 'opacity', [media.reducedMotion]: 'none' },
    transitionTimingFunction: 'ease-out',
    willChange: 'opacity',
    wordBreak: 'break-word',
  },
  exitAnimation: {
    transform: {
      default: null,
      [transitioning + sideTop]: `translateY(${spacing['--t-spacing-1']})`,
      [transitioning + sideBottom]:
        `translateY(calc(-1 * ${spacing['--t-spacing-1']}))`,
      [transitioning + sideLeft]: `translateX(${spacing['--t-spacing-1']})`,
      [transitioning + sideRight]:
        `translateX(calc(-1 * ${spacing['--t-spacing-1']}))`,
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: {
      default: 'opacity, transform',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-out, cubic-bezier(0.2, 0, 0, 1)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: spacing['--t-spacing-4'],
  },
  title: {
    alignItems: 'center',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    minInlineSize: 0,
  },
  titleText: {
    minInlineSize: 0,
    overflowWrap: 'anywhere',
  },
  icon: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    minInlineSize: 0,
  },
  description: {
    color: tooltip['--t-tooltip-description-color'],
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
  arrow: {
    background: 'inherit',
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
