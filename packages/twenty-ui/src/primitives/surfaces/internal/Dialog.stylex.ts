import * as stylex from '@stylexjs/stylex';

import {
  animationDuration,
  background,
  borderRadius,
  boxShadow,
  font,
  fontColor,
  fontSize,
  fontWeight,
  modalSize,
  spacing,
} from '../../../theme/tokens.stylex';

export const dialogViewportMarker = stylex.defineMarker();
export const dialogPopupMarker = stylex.defineMarker();

const transitioning = ':is([data-starting-style], [data-ending-style])';

export const dialogStyles = stylex.create({
  backdrop: {
    background: background['--t-background-overlay-primary'],
    inset: 0,
    opacity: { default: null, [transitioning]: 0 },
    position: 'fixed',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease-out',
    zIndex: 39,
  },
  viewport: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: { default: 'flex', ':is([hidden])': 'none' },
    inset: 0,
    justifyContent: 'center',
    overflow: 'auto',
    overscrollBehavior: 'contain',
    paddingBlock: {
      default: spacing['--t-spacing-4'],
      [stylex.when.descendant(
        ':is([data-size="fullscreen"])',
        dialogPopupMarker,
      )]: 0,
    },
    paddingInline: {
      default: spacing['--t-spacing-4'],
      [stylex.when.descendant(
        ':is([data-size="fullscreen"])',
        dialogPopupMarker,
      )]: 0,
    },
    pointerEvents: {
      default: null,
      ':is([data-backdrop-hidden="true"])': 'none',
    },
    position: 'fixed',
    zIndex: 40,
  },
  popup: {
    background: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-super-heavy'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: { default: 'flex', ':is([hidden])': 'none' },
    flexDirection: 'column',
    flexShrink: 0,
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    inlineSize: modalSize['--t-modal-size-md-width'],
    maxBlockSize: `calc(${modalSize['--t-modal-size-fullscreen-height']} - ${spacing['--t-spacing-8']})`,
    maxInlineSize: '100%',
    opacity: { default: null, [transitioning]: 0 },
    outline: 'none',
    overflow: 'auto',
    overscrollBehavior: 'contain',
    pointerEvents: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-backdrop-hidden="true"])',
        dialogViewportMarker,
      )]: 'auto',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease-out',
  },
  header: {
    '--tw-dialog-title-margin-block-end': '0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: spacing['--t-spacing-2'],
    padding: spacing['--t-spacing-6'],
  },
  body: {
    paddingBlockEnd: spacing['--t-spacing-6'],
    paddingBlockStart: 0,
    paddingInline: spacing['--t-spacing-6'],
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'flex-end',
    marginBlockStart: 'auto',
    paddingBlockEnd: spacing['--t-spacing-6'],
    paddingBlockStart: 0,
    paddingInline: spacing['--t-spacing-6'],
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    margin: 0,
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: 1.5,
    margin: 0,
  },
});

export const dialogPopupSizeStyles = stylex.create({
  sm: { inlineSize: modalSize['--t-modal-size-sm-width'] },
  compact: { inlineSize: modalSize['--t-modal-size-compact-width'] },
  lg: {
    inlineSize: `max(${modalSize['--t-modal-size-md-width']}, ${modalSize['--t-modal-size-lg-width']})`,
  },
  xl: { inlineSize: modalSize['--t-modal-size-xl-width'] },
  fullscreen: {
    blockSize: modalSize['--t-modal-size-fullscreen-height'],
    borderRadius: 0,
    boxShadow: 'none',
    inlineSize: '100%',
    maxBlockSize: 'none',
  },
});
