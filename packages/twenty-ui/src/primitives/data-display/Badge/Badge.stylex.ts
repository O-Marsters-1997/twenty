import * as stylex from '@stylexjs/stylex';

import {
  backgroundTransparent,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from '../../../theme/tokens.stylex';

export const badgeStyles = stylex.create({
  root: {
    '--badge-height': spacing['--t-spacing-4'],
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    blockSize: 'var(--badge-height)',
    borderRadius: borderRadius['--t-border-radius-pill'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontStyle: 'normal',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
  },
  sizeXs: {
    '--badge-height': `calc(${spacing['--t-spacing-3']} + ${spacing['--t-spacing-0_5']})`,
    fontSize: fontSize['--t-font-size-xxs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingInline: spacing['--t-spacing-1'],
  },
  sizeMd: {
    '--badge-height': `calc(${spacing['--t-spacing-4']} + ${spacing['--t-spacing-0_5']})`,
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-1_5'],
  },
  colorInherit: {
    backgroundColor: 'color-mix(in srgb, currentColor 16%, transparent)',
    color: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 'inherit',
  },
  colorPrimary: {
    backgroundColor: color['--t-color-blue'],
    color: fontColor['--t-font-color-on-accent'],
  },
  colorSecondary: {
    color: fontColor['--t-font-color-secondary'],
  },
  shapeCircle: {
    borderRadius: '50%',
    flexShrink: 0,
    inlineSize: 'var(--badge-height)',
    paddingInline: 0,
  },
});
